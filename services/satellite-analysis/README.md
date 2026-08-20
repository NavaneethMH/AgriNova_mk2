# AgriNova Satellite Analysis Service

This stateless FastAPI service accepts a GeoJSON field boundary and returns an image overlay plus georeferenced bounds. It starts in `SATELLITE_MODE=simulation`, generating deterministic Sentinel-2-style NDVI and NDWI preview data that is repeatable for the same polygon and safe for interface testing. No agricultural decision should be made from simulated values.

For a Cloud Run deployment, build from this directory, set `SATELLITE_MODE=simulation` for preview or `SATELLITE_MODE=earth_engine` for production, set `EARTH_ENGINE_PROJECT`, and use a service identity registered to Earth Engine. Optionally set `AGRINOVA_SERVICE_KEY`; the AgriNova web app sends it as `X-AgriNova-Service-Key`.

```bash
gcloud run deploy agrinova-satellite --source . --region <region> --set-env-vars SATELLITE_MODE=simulation
```

When switching to production, configure the Earth Engine-enabled project and workload/service-account permissions before setting `SATELLITE_MODE=earth_engine`.
