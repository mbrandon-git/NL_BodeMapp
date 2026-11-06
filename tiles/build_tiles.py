"""Build tiles/soil.pmtiles (vector tiles of the Bodemkaart polygons) for the map and location lookup.
Run with the QGIS Python (GDAL >= 3.8 can write PMTiles):
    "C:/Program Files/QGIS 3.44.9/bin/python-qgis-ltr.bat" tiles/build_tiles.py
Per polygon (layer 'soil'): i = row id in the source, sc = map code of the main unit (text before '/'),
pid = typical-profile id assigned to the polygon, mc = index of the main soil class (order = MAIN_CLASSES in shared/profiles_data.js).
Needs shared/profiles_data.js (run shared/build_data.py first). Source data: BRO Bodemkaart V2025-01 (CC0)."""
import os, re, json, sqlite3, sys, time
from osgeo import gdal, ogr

gdal.UseExceptions()
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
D = "C:/Users/brand153/Desktop/PhD_working_directory/Data/Raw_unzipped/Bodemdata/Levering-BRO-SGM-V2025-01_1/"
FLAT = D + "BRO-SGM-Bodemkaart-V2025-01_1.gpkg"
DOWN = D + "BRO-SGM-DownloadBodemkaart-V2025-01_1.gpkg"
OUT = os.path.join(HERE, "soil.pmtiles")
TMP = os.path.join(HERE, "_soil_tmp.gpkg")
MINZOOM = int(os.environ.get("MINZOOM", 6))
MAXZOOM = int(os.environ.get("MAXZOOM", 12))
SIMPL = os.environ.get("SIMPLIFICATION", "")

js = open(os.path.join(ROOT, "shared", "profiles_data.js"), encoding="utf-8").read()
classes = json.loads(re.search(r"window\.MAIN_CLASSES=(\[.*?\]);", js, re.S).group(1))
cls_index = {c: i for i, c in enumerate(classes)}

db = sqlite3.connect("file:" + DOWN + "?mode=ro", uri=True)
pid_of = dict(db.execute("select maparea_id, normalsoilprofile_id from soilarea_normalsoilprofile"))
main_of = dict(db.execute("select code, mainsoilclassification from soil_units"))

src = ogr.Open(FLAT)
lyr = src.GetLayerByName("soilarea")
for p in (TMP, OUT):
    if os.path.exists(p):
        os.remove(p)
tmp = ogr.GetDriverByName("GPKG").CreateDataSource(TMP)
out = tmp.CreateLayer("soil", srs=lyr.GetSpatialRef(), geom_type=ogr.wkbPolygon)
for name, typ in (("i", ogr.OFTInteger), ("sc", ogr.OFTString), ("pid", ogr.OFTInteger), ("mc", ogr.OFTInteger)):
    out.CreateField(ogr.FieldDefn(name, typ))
t0 = time.time()
n = miss = 0
tmp.StartTransaction()
for f in lyr:
    mid = f.GetField("maparea_id")
    base = f.GetField("first_soilcode")
    feat = ogr.Feature(out.GetLayerDefn())
    feat.SetField("i", f.GetFID())
    feat.SetField("sc", (f.GetField("soilcode") or "").split("/")[0])
    pid = pid_of.get(mid)
    if pid is None:
        miss += 1
    else:
        feat.SetField("pid", int(pid))
    feat.SetField("mc", cls_index.get(main_of.get(base), -1))
    feat.SetGeometry(f.GetGeometryRef().Clone())
    out.CreateFeature(feat)
    n += 1
tmp.CommitTransaction()
tmp = None
print("features copied:", n, "| without profile:", miss, "| %.1f s" % (time.time() - t0), flush=True)

opts = ["NAME=soil", "DESCRIPTION=Bodemkaart van Nederland 1:50000 (BRO, CC0)", "MINZOOM=%d" % MINZOOM, "MAXZOOM=%d" % MAXZOOM]
if SIMPL:
    opts.append("SIMPLIFICATION=" + SIMPL)
t0 = time.time()
gdal.VectorTranslate(OUT, TMP, format="PMTiles", datasetCreationOptions=opts, layerCreationOptions=["NAME=soil"])
print("PMTiles written: %s | %.1f MB | zoom %d-%d | %.0f s" % (OUT, os.path.getsize(OUT) / 1e6, MINZOOM, MAXZOOM, time.time() - t0))
os.remove(TMP)
