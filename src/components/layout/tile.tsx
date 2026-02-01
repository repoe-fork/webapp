import React, { Suspense, useEffect, useMemo, useState } from "react";
import { ARMFile, ARMSlot } from "lib/arm";
import { queryOptions, useQueries, useSuspenseQuery } from "@tanstack/react-query";
import { parseMTP } from "lib/mtp";
import { parseTDT, TDTFile } from "lib/tdt";
import { fitsInSlot, TileKey } from "lib/tile_matching";
import { useLocation, useNavigate, useQueryParam } from "use-navigation-api";

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

export interface CandidateMatch {
  tile: any;
  tdt: TDTFile;
  rotation: number;
  flip: boolean;
  failureReason?: string;
  success: boolean;
}

export const Tile: React.FC<{
  x: number;
  y: number;
  posX: number;
  posY: number;
  room: ARMFile;
  graph: any;
  cellSize: number;
  onInspect?: (candidates: CandidateMatch[]) => void;
  isInspected?: boolean;
  selectedMatchIndex?: number | null;
  onSelectMatch?: (index: number | null) => void;
}> = ({
  x,
  y,
  posX,
  posY,
  room,
  graph,
  cellSize,
  onInspect,
  isInspected,
}) => {
  const cell = room.grid[y][x] as ARMSlot;
  if (cell.tag !== "k") return null;
  const navigate = useNavigate();
  const selectedTile = useQueryParam("tile");
  const location = useLocation();

  const tileCandidates = useMemo(
    () =>
      graph.tile_set?.filter(({ tile_tag }: any) => !cell.tile_tag || tile_tag === cell.tile_tag) ||
      [],
    [cell.tile_tag, graph.tile_set],
  );

  const tdtQueries = useQueries({
    queries: tileCandidates.map((tile: any) => getTDT(tile.file)),
  });

  const tileResults = useMemo(() => {
    const results: CandidateMatch[] = [];
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
          results.push({
            tile,
            tdt,
            rotation,
            flip,
            success: res.success,
            failureReason: res.failureReason,
          });
        }
      }
    });
    return results;
  }, [tileCandidates, tdtQueries, cell]);

  const firstSuccess = tileResults.find((r) => r.success);

  useEffect(() => {
    if (!selectedTile) {
      let file = firstSuccess?.tile?.file;
      if (!file) return;
      navigate.navigate(location.setQuery("tile", file));
    }
  }, [selectedTile, firstSuccess, navigate]);

  const displayMatch =
    (isInspected && selectedTile && tileResults.find(({ tile }) => selectedTile === tile.file)) ||
    firstSuccess;

  return (
    <g onClick={() => onInspect?.(tileResults)} style={{ cursor: "pointer" }}>
      {isInspected && (
        <rect
          x={posX - 6}
          y={posY - 6}
          width={12}
          height={12}
          fill="none"
          stroke="yellow"
          strokeWidth={2}
          rx={6}
        />
      )}
      {displayMatch && (
        <>
          <Suspense fallback={<circle cx={posX} cy={posY} r={4} fill="gray" opacity={0.3} />}>
            <Minimap
              tile={displayMatch.tile}
              x={posX}
              y={posY}
              rotation={displayMatch.rotation}
              flip={displayMatch.flip}
            />
          </Suspense>
        </>
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
  // We center the image horizontally around 'x' which is the top corner of the isometric diamond.
  const imageX = x - width / 2;
  const imageY = y;
  const transform = flip ? `translate(${x}, ${y}) scale(-1, 1) translate(${-x}, ${-y})` : undefined;

  return (
    <image
      href={`https://i.ggpk.exposed/poe2/minimap/${path}.dds?x=${sprite.left}&y=${sprite.top}&w=${width}&h=${height}`}
      x={imageX}
      y={imageY}
      width={width}
      height={height}
      transform={transform}
    />
  );
};
