import React, { Suspense, useEffect, useMemo, useState } from "react";
import { ARMFile, ARMSlot } from "lib/arm";
import { queryOptions, useQueries, useSuspenseQuery } from "@tanstack/react-query";
import { parseMTP } from "lib/mtp";
import { parseTDT, TDTFile } from "lib/tdt";
import { fitsInSlot, TileKey } from "lib/tile_matching";

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

export const getTDT = (filename: string) =>
  queryOptions({
    queryKey: ["tdt", { filename }],
    queryFn: () =>
      fetch(`https://ggpk.exposed/poe2/${filename}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch TDT ${filename}: ${r.statusText}`);
          return r.arrayBuffer();
        })
        .then(parseTDT),
  });

interface MatchedTile {
  tile: any;
  tdt: TDTFile;
  rotation: number;
  flip: boolean;
  failureReason?: string;
}

export const Tile: React.FC<{
  x: number;
  y: number;
  posX: number;
  posY: number;
  room: ARMFile;
  graph: any;
  cellSize: number;
}> = ({ x, y, posX, posY, room, graph, cellSize }) => {
  const cell = room.grid[y][x] as ARMSlot;
  if (cell.tag !== "k") return null;

  const tileCandidates = useMemo(
    () =>
      graph.tile_set?.filter(({ tile_tag }: any) => !cell.tile_tag || tile_tag === cell.tile_tag) ||
      [],
    [cell.tile_tag, graph.tile_set],
  );

  const tdtQueries = useQueries({
    queries: tileCandidates.map((tile: any) => getTDT(tile.file)),
  });

  const matchedTiles = useMemo(() => {
    const results: MatchedTile[] = [];
    const slotKey = TileKey.fromSlot(cell);

    tileCandidates.forEach((tile: any, i: number) => {
      const tdt = tdtQueries[i].data as TDTFile;
      if (!tdt || "tdt" in tdt) return;

      const baseKey = TileKey.fromTDT(tdt);
      const rotations = [0, 90, 180, 270];
      const flips = [false, true];

      for (const flip of flips) {
        const flippedKey = baseKey.flipped(flip);
        for (const rotation of rotations) {
          const mutatedKey = flippedKey.rotated(rotation);
          const res = fitsInSlot(mutatedKey, slotKey);
          if (res.success) {
            results.push({ tile, tdt, rotation, flip });
          }
        }
      }
    });
    return results;
  }, [tileCandidates, tdtQueries, cell]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= matchedTiles.length) {
      setIndex(0);
    }
  }, [index, matchedTiles.length]);

  if (!matchedTiles.length) return null;

  const match = matchedTiles[index];

  return (
    <g>
      <Suspense
        fallback={
          <rect x={posX} y={posY} width={cellSize} height={cellSize} fill="gray" opacity={0.3} />
        }>
        <Minimap tile={match.tile} x={posX} y={posY} rotation={match.rotation} flip={match.flip} />
      </Suspense>
      {matchedTiles.length > 1 && (
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
              {matchedTiles.map((m, i) => (
                <option key={i} value={i}>
                  {m.tile.file.split("/").pop()} {m.rotation}° {m.flip ? "F" : ""}
                </option>
              ))}
            </select>
          </div>
        </foreignObject>
      )}
    </g>
  );
};

const Minimap: React.FC<{ tile: any; x: number; y: number; rotation: number; flip: boolean }> = ({
  tile,
  x,
  y,
  rotation,
  flip,
}) => {
  const path = tile.file.substring(0, tile.file.lastIndexOf("/")).replaceAll(/\W/g, "_");
  const { data: spriteSheet } = useSuspenseQuery(getSpriteSheet(path + ".mtp"));

  if (!spriteSheet) return null;

  // We want to find the sprite that matches our required rotation.
  // MTP rotations are 0, 1, 2, 3 corresponding to R0, R90, R180, R270?
  // Let's assume mtp rotation 1 = 90 deg clockwise.
  const mtpRotation = rotation / 90;

  const sprites = spriteSheet.records.filter(
    ({ filename, rotation: r }) =>
      tile.file.toLowerCase() === filename?.toLowerCase() && r === mtpRotation,
  );

  const sprite = sprites[0];
  if (!sprite?.filename) return null;

  const width = sprite.right - sprite.left;
  const height = sprite.bottom - sprite.top;

  // Apply flip if needed. Since SVG doesn't have a simple flip, we use transform.
  const transform = flip
    ? `translate(${x + width}, ${y}) scale(-1, 1) translate(${-x}, ${-y})`
    : undefined;

  return (
    <image
      href={`https://i.ggpk.exposed/poe2/minimap/${path}.dds?x=${sprite.left}&y=${sprite.top}&w=${width}&h=${height}`}
      x={x}
      y={y}
      width={width}
      height={height}
      transform={transform}
    />
  );
};
