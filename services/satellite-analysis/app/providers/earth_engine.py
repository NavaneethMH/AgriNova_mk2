"""Earth Engine production provider for the same /v1/analyze contract.

This module is not exercised in local simulation mode. It uses Sentinel-2 SR
Harmonized bands B8/B4 for NDVI and B8/B11 for the user's moisture overlay.
"""
from __future__ import annotations

import os

import ee

from app.main import AnalysisRequest, AnalysisResponse, bounds_for, polygon_from_boundary


def _initialize() -> None:
    project = os.environ["EARTH_ENGINE_PROJECT"]
    ee.Initialize(project=project)


def analyze_earth_engine(request: AnalysisRequest) -> AnalysisResponse:
    _initialize()
    polygon = polygon_from_boundary(request.boundary)
    region = ee.Geometry.Polygon(polygon.coordinates)
    collection = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
        .filterBounds(region)
        .filterDate("2024-01-01", "2030-01-01")
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 35))
        .sort("CLOUDY_PIXEL_PERCENTAGE"))
    image = ee.Image(collection.first()).clip(region).divide(10_000)
    index = image.normalizedDifference(["B8", "B4"] if request.indexType == "ndvi" else ["B8", "B11"]).rename(request.indexType)
    palette = ["#e74c3c", "#f5c542", "#72b95f", "#176b47"] if request.indexType == "ndvi" else ["#a046dc", "#5487d8", "#42bad0", "#155e9e"]
    overlay_url = index.visualize(min=-1, max=1, palette=palette).getThumbURL({"region": polygon.coordinates, "dimensions": 768, "format": "png"})
    stats = index.reduceRegion(reducer=ee.Reducer.mean(), geometry=region, scale=10, maxPixels=10_000_000).getInfo()
    properties = image.toDictionary(["system:time_start", "CLOUDY_PIXEL_PERCENTAGE"]).getInfo()
    return AnalysisResponse(provider="google-earth-engine-sentinel-2", indexType=request.indexType, overlayUrl=overlay_url, bounds=bounds_for(request.boundary), meanValue=round(float(stats[request.indexType]), 2), acquiredAt=properties["system:time_start"], cloudPercent=float(properties.get("CLOUDY_PIXEL_PERCENTAGE", 0)), mode="earth_engine")
