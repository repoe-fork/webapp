import React, { useMemo } from "react";
import { ARMFile } from "lib/arm";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { parseMTP } from "lib/mtp";

export const getSpriteSheet = (filename: string) =>
  queryOptions({
    queryKey: ["spritesheet", { filename }],
    queryFn: () =>
      fetch(`https://ggpk.exposed/poe2/minimap/${filename}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch sprite sheet ${filename}: ${r.statusText}`);
          return r.arrayBuffer();
        })
        .then(parseMTP),
  });

export const Tile: React.FC<{
  x: number;
  y: number;
  posX: number;
  posY: number;
  room: ARMFile;
  graph: any;
  cellSize: number;
}> = ({ x, y, posX, posY, room, graph }) => {
  const [index] = React.useState(0);

  const cell = room.grid[y][x];
  if (cell.tag !== "k") return null;

  const tiles = useMemo(
    () =>
      !cell.tile_tag
        ? []
        : graph.tile_set?.filter(({ tile_tag }: any) => tile_tag === cell.tile_tag),
    [cell, graph],
  );

  if (!tiles.length) return null;

  return <Minimap tile={tiles[index]} x={posX} y={posY} />;
};

const Minimap: React.FC<{ tile: any; x: number; y: number }> = ({ tile, x, y }) => {
  const path = tile.file.substring(0, tile.file.lastIndexOf("/")).replaceAll(/\W/g, "_");
  const { data: spriteSheet } = useSuspenseQuery(getSpriteSheet(path + ".mtp"));
  if (!spriteSheet) return null;
  const sprite = spriteSheet.records.find(
    ({ filename }) => tile.file.toLowerCase() === filename?.toLowerCase(),
  );
  if (!sprite?.filename) return null;
  const width = sprite.right - sprite.left;
  const height = sprite.bottom - sprite.top;

  return (
    <image
      href={`https://i.ggpk.exposed/poe2/minimap/${path}.dds?x=${sprite.left}&y=${sprite.top}&w=${width}&h=${height}`}
      x={x}
      y={y}
      width={width}
      height={height}
    />
  );
};
