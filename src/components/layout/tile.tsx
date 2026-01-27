import React, { useEffect, useMemo, useState } from "react";
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
}> = ({ x, y, posX, posY, room, graph, cellSize }) => {
  const [index, setIndex] = useState(0);

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

  useEffect(() => {
    if (index >= tiles.length) {
      setIndex(0);
    }
  }, [index, tiles.length]);

  return (
    <g>
      <Minimap tile={tiles[index]} x={posX} y={posY} />
      {tiles.length > 1 && (
        <foreignObject x={posX + 6} y={posY} width={cell.width * cellSize - 12} height={18}>
          <div>
            <select
              value={index}
              onChange={(event) => setIndex(Number(event.target.value))}
              style={{
                fontSize: "10px",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                border: "1px solid #666",
                borderRadius: "2px",
                height: "16px",
              }}>
              {tiles.map((tile: any, tileIndex: number) => (
                <option key={tile.file ?? tileIndex} value={tileIndex}>
                  {tile.file}
                </option>
              ))}
            </select>
          </div>
        </foreignObject>
      )}
    </g>
  );
};

const Minimap: React.FC<{ tile: any; x: number; y: number }> = ({ tile, x, y }) => {
  const path = tile.file.substring(0, tile.file.lastIndexOf("/")).replaceAll(/\W/g, "_");
  const { data: spriteSheet } = useSuspenseQuery(getSpriteSheet(path + ".mtp"));
  const [selected, setSelected] = useState(0);
  if (!spriteSheet) return null;
  const sprites = spriteSheet.records.filter(
    ({ filename }) => tile.file.toLowerCase() === filename?.toLowerCase(),
  );
  if (!sprites.length) return null;
  useEffect(() => {
    if (selected >= sprites.length) {
      setSelected(0);
    }
  }, [selected, sprites.length]);
  const sprite = sprites[selected];
  if (!sprite?.filename) return null;
  const width = sprite.right - sprite.left;
  const height = sprite.bottom - sprite.top;

  return (
    <g>
      <image
        href={`https://i.ggpk.exposed/poe2/minimap/${path}.dds?x=${sprite.left}&y=${sprite.top}&w=${width}&h=${height}`}
        x={x}
        y={y}
        width={width}
        height={height}
      />
      {sprites.length > 1 && (
        <foreignObject x={x + 6} y={y + 20} width={Math.max(36, Math.min(90, width - 8))} height={18}>
          <div>
            <select
              value={selected}
              onChange={(event) => setSelected(Number(event.target.value))}
              style={{
                fontSize: "10px",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                border: "1px solid #666",
                borderRadius: "2px",
                height: "16px",
              }}>
              {sprites.map((spriteOption, spriteIndex) => (
                <option key={`${spriteOption.rotation}-${spriteIndex}`} value={spriteIndex}>
                  rot {spriteOption.rotation}
                </option>
              ))}
            </select>
          </div>
        </foreignObject>
      )}
    </g>
  );
};
