import React, { useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { parseARM } from "lib/arm";
import { CandidateMatch, Tile } from "components/layout/tile";
import { SlotInspector } from "components/layout/slot_info";

const TRUE = true as const;
const FALSE = false as const;

export const getRoom = (filename: string) =>
  queryOptions({
    queryKey: ["room", { filename }],
    queryFn: () =>
      fetch(`https://ggpk.exposed/poe2/${filename}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch room: ${r.statusText}`);
          return r.text();
        })
        .then(parseARM),
  });

export const Room: React.FC<{
  roomPath: string;
  graph: any;
  cellSize?: number;
  orthogonal?: boolean;
  detailed?: boolean;
  selected?: boolean;
}> = ({ roomPath, graph, cellSize = 50, orthogonal, detailed, selected }) => {
  const { data: arm, error } = useSuspenseQuery(getRoom(roomPath));
  const [inspected, setInspected] = useState<{
    x: number;
    y: number;
    cell: any;
    candidates: CandidateMatch[];
    selectedCandidateIndex: number | null;
  } | null>(null);

  if (error) return <p className="text-sm text-red-500">Error loading room</p>;
  if (!arm) return null;

  const getIso = (x: number, y: number) => {
    if (orthogonal) {
      return { x: x * cellSize, y: y * cellSize };
    }
    return {
      x: (x - y) * (cellSize / 2),
      y: (x + y) * (cellSize / 4),
    };
  };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const cells = arm.grid.map((row, y) =>
    row.map((cell, x) => {
      let fill = "none";
      let stroke = "#444";
      let opacity = 0.8;
      let cellWidth = 1;
      let cellHeight = 1;
      let yOffset = orthogonal ? -1 : 0;
      let xOffset = 0;

      switch (cell.tag) {
        case "k":
          fill = "#556";
          stroke = "#778";
          cellWidth = cell.width;
          cellHeight = cell.height;
          if (orthogonal) {
            if (!cell.origin?.includes("n")) yOffset += cell.height - 1;
            if (cell.origin?.includes("e")) xOffset -= cell.width - 1;
          } else {
            if (cell.origin?.includes("n")) yOffset -= cell.height - 1;
            if (cell.origin?.includes("e")) xOffset -= cell.width - 1;
          }
          break;
        case "f":
          fill = "#445";
          stroke = "#556";
          break;
        case "s":
          fill = "#222";
          break;
        case "o":
          fill = "none";
          opacity = 0.2;
          break;
        case "n":
          return { skip: TRUE };
      }

      const p1 = getIso(
        x + xOffset,
        orthogonal ? arm.root_slot.height - (y + yOffset) : y + yOffset,
      );
      const p2 = getIso(
        x + xOffset + cellWidth,
        orthogonal ? arm.root_slot.height - (y + yOffset) : y + yOffset,
      );
      const p3 = getIso(
        x + xOffset + cellWidth,
        orthogonal ? arm.root_slot.height - (y + yOffset + cellHeight) : y + yOffset + cellHeight,
      );
      const p4 = getIso(
        x + xOffset,
        orthogonal ? arm.root_slot.height - (y + yOffset + cellHeight) : y + yOffset + cellHeight,
      );

      const points = [p1, p2, p3, p4];
      points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });

      return {
        cell,
        fill,
        stroke,
        opacity,
        cellWidth,
        cellHeight,
        xOffset,
        yOffset,
        skip: FALSE,
        p1,
        points: points.map((p) => `${p.x},${p.y}`).join(" "),
      };
    }),
  );

  const viewWidth = maxX - minX;
  const viewHeight = maxY - minY;
  const viewBox = `${minX - 10} ${minY - 10} ${viewWidth + 20} ${viewHeight + 20}`;

  return (
    <div
      className={`rounded-md border border-slate-800 bg-slate-900 p-2 text-slate-200 ${
        selected ? "ring-2 ring-slate-200" : "hover:border-slate-500"
      }`}>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs text-slate-300">
          {roomPath.split("/").pop()} ({arm.root_slot.width}x{arm.root_slot.height})
        </p>
      </div>
      <svg viewBox={viewBox} style={{ width: "100%", maxWidth: viewWidth * 2, display: "block" }}>
        {cells.map((row, y) =>
          row.map(({ cell, fill, stroke, opacity, skip, p1, points }, x) =>
            skip ? null : (
              <React.Fragment key={`${x}-${y}`}>
                <polygon
                  points={points}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={0.5}
                  opacity={opacity}
                  onClick={() => {
                    if (cell.tag !== "k") {
                      setInspected(null);
                    }
                  }}>
                  <title>
                    {x},{y} - {cell.tag}
                    {cell.tag === "k" &&
                      ` (${cell.width}x${cell.height}) from ${cell.origin}${
                        cell.tile_tag ? `\nTag: ${cell.tile_tag}` : ""
                      }\nEdges:\n${Object.entries(cell.edges)
                        .map(
                          ([k, v]) =>
                            `  ${k}: ${v.edge || "none"} (${v.exit}, ${v.virtual_exit}) ${
                              v.exit === (["w", "e"].includes(k) ? cell.height : cell.width) * 3
                                ? "[LIMIT]"
                                : ""
                            }`,
                        )
                        .join("\n")}\nCorners:\n${Object.entries(cell.corners)
                        .map(([k, v]: any) => `  ${k}: ${v.ground || "none"} (h:${v.height})`)
                        .join("\n")}`}
                    {cell.tag === "f" && `\nFill: ${cell.fill}`}
                  </title>
                </polygon>
                {cell.tag === "k" && (
                  <Tile
                    x={x}
                    y={y}
                    posX={p1.x}
                    posY={p1.y}
                    room={arm}
                    graph={graph}
                    cellSize={cellSize}
                    onInspect={(candidates) =>
                      detailed &&
                      setInspected({
                        x,
                        y,
                        cell,
                        candidates,
                        selectedCandidateIndex: null,
                      })
                    }
                    isInspected={inspected?.x === x && inspected?.y === y}
                  />
                )}
              </React.Fragment>
            ),
          ),
        )}
      </svg>
      {detailed && inspected && (
        <SlotInspector
          slot={inspected.cell}
          candidates={inspected.candidates}
          x={inspected.x}
          y={inspected.y}
          selectedCandidateIndex={inspected.selectedCandidateIndex}
          onSelectCandidate={(idx) => setInspected({ ...inspected, selectedCandidateIndex: idx })}
        />
      )}
    </div>
  );
};

export const RoomJson: React.FC<{ roomPath: string }> = ({ roomPath }) => {
  const { data: arm, error } = useSuspenseQuery(getRoom(roomPath));

  if (error) return <p className="text-sm text-red-500">Error loading room JSON</p>;
  if (!arm) return null;

  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-950 p-2 text-xs text-slate-100">
      {JSON.stringify(arm, undefined, 2)}
    </pre>
  );
};
