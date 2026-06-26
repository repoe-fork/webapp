import json
import glob
import os

files = glob.glob("/home/ivy/poe/poe2-0.4/Metadata/Terrain/**/*.tgr.json", recursive=True)
for file in files:
    with open(file, "r") as f:
        data = json.load(f)
    
    modified = False
    for edge in data.get("edges", []):
        if "from_" in edge:
            edge["from"] = edge.pop("from_")
            modified = True
            
    if modified:
        with open(file, "w") as f:
            json.dump(data, f, indent=2)
print(f"Checked {len(files)} files.")
