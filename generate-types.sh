#!/usr/bin/env bash

rm -f world_areas.json
wget 'https://repoe-fork.github.io/data-formats/world_areas.json'
npx quicktype world_areas.json -s schema -o src/types/world_areas.ts --top-level Area --just-types
