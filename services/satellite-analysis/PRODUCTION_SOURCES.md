# Production Satellite Service Sources

The production provider is designed around Google Earth Engine’s Python client, which requires authenticated initialization against a Cloud project. For unattended Cloud Run execution, use a service identity registered for Earth Engine rather than interactive user credentials. [1] [2]

The selected collection is `COPERNICUS/S2_SR_HARMONIZED`, which provides harmonized Sentinel-2 Level-2A surface-reflectance imagery. Its B4 (red) and B8 (NIR) bands are 10 m; B11 (SWIR1) is 20 m. AgriNova’s production NDVI uses B8 and B4. Its requested moisture overlay uses B8 and B11; this NIR/SWIR normalized difference is labelled NDWI in the product interface to match the specified terminology. [3]

The API returns a visualized index overlay clipped to the GeoJSON field boundary. Earth Engine supports an image thumbnail URL with a supplied region and PNG format, which makes the result suitable for a map image overlay. [4]

## References

[1]: https://developers.google.com/earth-engine/guides/python_install "Earth Engine Python Installation"
[2]: https://developers.google.com/earth-engine/guides/auth "Earth Engine Authentication"
[3]: https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED "COPERNICUS/S2_SR_HARMONIZED"
[4]: https://developers.google.com/earth-engine/apidocs/ee-image-getthumburl "ee.Image.getThumbURL"
