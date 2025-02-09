#!/usr/bin/env bash

rm -f world_areas.schema.json
wget 'https://github.com/repoe-fork/repoe-fork.github.io/raw/refs/heads/master/RePoE/schema/world_areas.schema.json'
npx quicktype world_areas.schema.json -s schema -o src/types/world_areas.ts --top-level Area --just-types
