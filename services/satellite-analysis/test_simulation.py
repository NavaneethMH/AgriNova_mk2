from app.main import AnalysisRequest, GeoJsonFeature, PolygonGeometry, analyze_simulation


def main() -> None:
    boundary = GeoJsonFeature(
        type="Feature",
        geometry=PolygonGeometry(
            type="Polygon",
            coordinates=[[(77.58, 12.96), (77.59, 12.96), (77.59, 12.97), (77.58, 12.97), (77.58, 12.96)]],
        ),
    )
    first = analyze_simulation(AnalysisRequest(boundary=boundary, indexType="ndvi"))
    second = analyze_simulation(AnalysisRequest(boundary=boundary, indexType="ndvi"))
    assert first.overlayUrl.startswith("data:image/svg+xml;base64,")
    assert first.overlayUrl == second.overlayUrl
    assert first.bounds.north == 12.97 and first.bounds.south == 12.96
    print("Satellite simulation contract passed")


if __name__ == "__main__":
    main()
