"""Stateless AgriNova satellite-analysis service.

SATELLITE_MODE=simulation provides deterministic Sentinel-2-style NDVI and NDWI
preview overlays for UI and workflow validation. Switch to earth_engine after
deploying with a registered Earth Engine Cloud project and service identity.
"""
from __future__ import annotations

import base64
import hashlib
import html
import math
import os
from datetime import UTC, datetime
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

app = FastAPI(title="AgriNova Satellite Analysis", version="1.0.0")


class PolygonGeometry(BaseModel):
    type: Literal["Polygon"]
    coordinates: list[list[tuple[float, float]]]

    @field_validator("coordinates")
    @classmethod
    def ensure_closed_polygon(cls, coordinates: list[list[tuple[float, float]]]):
        if not coordinates or len(coordinates[0]) < 4:
            raise ValueError("A polygon needs at least four positions including the closing position.")
        ring = coordinates[0]
        if ring[0] != ring[-1]:
            raise ValueError("The polygon ring must be closed.")
        return coordinates


class GeoJsonFeature(BaseModel):
    type: Literal["Feature"]
    properties: dict = Field(default_factory=dict)
    geometry: PolygonGeometry


class AnalysisRequest(BaseModel):
    boundary: GeoJsonFeature | PolygonGeometry
    indexType: Literal["ndvi", "ndwi"]


class Bounds(BaseModel):
    north: float
    south: float
    east: float
    west: float


class AnalysisResponse(BaseModel):
    provider: str
    indexType: Literal["ndvi", "ndwi"]
    overlayUrl: str
    bounds: Bounds
    meanValue: float
    acquiredAt: datetime
    cloudPercent: float
    mode: Literal["simulation", "earth_engine"]


def polygon_from_boundary(boundary: GeoJsonFeature | PolygonGeometry) -> PolygonGeometry:
    return boundary.geometry if isinstance(boundary, GeoJsonFeature) else boundary


def bounds_for(boundary: GeoJsonFeature | PolygonGeometry) -> Bounds:
    ring = polygon_from_boundary(boundary).coordinates[0]
    longitudes = [point[0] for point in ring]
    latitudes = [point[1] for point in ring]
    return Bounds(north=max(latitudes), south=min(latitudes), east=max(longitudes), west=min(longitudes))


def deterministic_value(boundary: GeoJsonFeature | PolygonGeometry, index_type: str) -> float:
    serialized = repr(polygon_from_boundary(boundary).coordinates) + index_type
    digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
    seed = int(digest[:8], 16) / 0xFFFFFFFF
    return round((-0.05 + seed * 0.78) if index_type == "ndvi" else (-0.25 + seed * 0.62), 2)


def normalized_polygon(boundary: GeoJsonFeature | PolygonGeometry, bounds: Bounds) -> str:
    ring = polygon_from_boundary(boundary).coordinates[0]
    width = max(bounds.east - bounds.west, 1e-9)
    height = max(bounds.north - bounds.south, 1e-9)
    points = []
    for longitude, latitude in ring:
        x = 24 + (longitude - bounds.west) / width * 720
        y = 24 + (bounds.north - latitude) / height * 432
        points.append(f"{x:.1f},{y:.1f}")
    return " ".join(points)


def simulated_overlay(boundary: GeoJsonFeature | PolygonGeometry, index_type: str, bounds: Bounds, mean_value: float) -> str:
    palette = ("#e74c3c", "#f5c542", "#72b95f", "#176b47") if index_type == "ndvi" else ("#a046dc", "#5487d8", "#42bad0", "#155e9e")
    polygon = normalized_polygon(boundary, bounds)
    gradient = "".join(f'<stop offset="{index * 33}%" stop-color="{color}" />' for index, color in enumerate(palette))
    circles = "".join(
        f'<circle cx="{120 + index * 105}" cy="{235 + math.sin(index * 1.9) * 90:.1f}" r="{92 + (index % 3) * 14}" fill="{palette[(index + 1) % 4]}" opacity="0.34" />'
        for index in range(7)
    )
    label = html.escape(f"SIMULATED {index_type.upper()}  ·  {mean_value:+.2f}")
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="768" height="480" viewBox="0 0 768 480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">{gradient}</linearGradient><clipPath id="field"><polygon points="{polygon}" /></clipPath><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="#ffffff" stroke-opacity="0.18" /></pattern></defs><rect width="768" height="480" fill="#0b2031" opacity="0.12"/><g clip-path="url(#field)"><rect width="768" height="480" fill="url(#g)"/>{circles}<rect width="768" height="480" fill="url(#grid)"/></g><polygon points="{polygon}" fill="none" stroke="#ffffff" stroke-width="4" stroke-opacity="0.92"/><rect x="24" y="24" width="256" height="42" rx="12" fill="#10251d" fill-opacity="0.78"/><text x="42" y="51" fill="white" font-family="Arial,sans-serif" font-size="16" font-weight="700">{label}</text></svg>'''
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode("ascii")


def analyze_simulation(request: AnalysisRequest) -> AnalysisResponse:
    bounds = bounds_for(request.boundary)
    mean_value = deterministic_value(request.boundary, request.indexType)
    return AnalysisResponse(provider="sentinel-2-simulated", indexType=request.indexType, overlayUrl=simulated_overlay(request.boundary, request.indexType, bounds, mean_value), bounds=bounds, meanValue=mean_value, acquiredAt=datetime.now(UTC), cloudPercent=round(6 + abs(mean_value) * 17, 1), mode="simulation")


def validate_service_key(service_key: str | None):
    expected = os.getenv("AGRINOVA_SERVICE_KEY", "")
    if expected and service_key != expected:
        raise HTTPException(status_code=401, detail="Invalid satellite service key.")


@app.get("/healthz")
def healthz(service_key: str | None = Header(default=None, alias="X-AgriNova-Service-Key")):
    validate_service_key(service_key)
    return {"status": "ok", "mode": os.getenv("SATELLITE_MODE", "simulation")}


@app.post("/v1/analyze", response_model=AnalysisResponse)
def analyze(request: AnalysisRequest, service_key: str | None = Header(default=None, alias="X-AgriNova-Service-Key")):
    validate_service_key(service_key)
    mode = os.getenv("SATELLITE_MODE", "simulation")
    if mode == "simulation":
        return analyze_simulation(request)
    # The real Earth Engine implementation is intentionally isolated from the simulator.
    # It will be enabled only when the Cloud Run service has a registered project identity.
    from app.providers.earth_engine import analyze_earth_engine
    return analyze_earth_engine(request)
