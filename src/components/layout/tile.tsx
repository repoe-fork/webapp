import React, { Suspense, useEffect, useMemo } from "react";
import { ARMFile, ARMSlot } from "lib/arm";
import { useQueries } from "@tanstack/react-query";
import { TDTFile } from "lib/tdt";
import { fitsInSlot, TileKey } from "lib/tile_matching";
import { useLocation, useNavigate, useQueryParam } from "use-navigation-api";
import { getTDT } from "queries/tdt";
import { Minimap } from "components/layout/minimap";

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
}> = ({ x, y, posX, posY, room, graph, onInspect, isInspected }) => {
  const cell = room.grid[y][x] as ARMSlot;
  if (cell.tag !== "k") return null;
  const navigate = useNavigate();
  const selectedTile = useQueryParam("tile");
  const location = useLocation();

  const tileCandidates = useMemo(
    () =>
      [...new Set(graph.tile_set || [])].filter(
        ({ tile_tag }: any) => !cell.tile_tag || tile_tag === cell.tile_tag,
      ) || [],
    [cell.tile_tag, graph.tile_set],
  );

  const game = useQueryParam("game") === "poe2" ? "poe2" : "poe1";
  const tdtQueries = useQueries({
    queries: tileCandidates.map((tile: any) => getTDT(tile.file, game)),
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
