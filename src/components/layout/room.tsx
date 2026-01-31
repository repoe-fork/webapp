import React from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { parseARM } from "lib/arm";
import { Tile } from "components/layout/tile";

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

export const Room: React.FC<{ roomPath: string; graph: any }> = ({ roomPath, graph }) => {
  const { data: arm, error } = useSuspenseQuery(getRoom(roomPath));

  if (error) return <p className="text-sm text-red-500">Error loading room</p>;
  if (!arm) return null;

  const cellSize = 50;
  const width = arm.root_slot.width * cellSize;
  const height = arm.root_slot.height * cellSize;

  let minX = 0;
  let minY = 0;
  let maxX = width;
  let maxY = height;

  const cells = arm.grid.map((row, y) =>
    row.map((cell, x) => {
      let fill = "none";
      let stroke = "#444";
      let opacity = 0.8;
      let cellWidth = 1;
      let cellHeight = 1;
      // Y-axis of svg (0,0 top left) is inverted relative to the grid cells (0,0 bottom left)
      let yOffset = -1;
      let xOffset = 0;

      switch (cell.tag) {
        case "k":
          fill = "#556";
          stroke = "#778";
          cellWidth = cell.width;
          cellHeight = cell.height;
          if (!cell.origin?.includes("n")) {
            yOffset += cell.height - 1;
          }
          if (cell.origin?.includes("e")) {
            xOffset -= cell.width - 1;
          }

          const left = (x + xOffset) * cellSize;
          const top = height - (y + yOffset) * cellSize;

          minX = Math.min(minX, left);
          minY = Math.min(minY, top);
          maxX = Math.max(maxX, left + cellWidth * cellSize);
          maxY = Math.max(maxY, top + cellHeight * cellSize);
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

      return { cell, fill, stroke, opacity, cellWidth, cellHeight, xOffset, yOffset, skip: FALSE };
    }),
  );

  const viewWidth = maxX - minX;
  const viewHeight = maxY - minY;
  const viewBox = `${minX} ${minY} ${viewWidth} ${viewHeight}`;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 p-2 text-slate-200">
      <p className="mb-1 text-xs text-slate-300">
        {roomPath.split("/").pop()} ({arm.root_slot.width}x{arm.root_slot.height})
      </p>
      <svg viewBox={viewBox} style={{ width: "100%", maxWidth: viewWidth * 2, display: "block" }}>
        {cells.map((row, y) =>
          row.map(
            ({ cell, fill, stroke, opacity, cellWidth, cellHeight, xOffset, yOffset, skip }, x) =>
              skip ? null : (
                <>
                  <rect
                    key={`${x}-${y}`}
                    x={(x + xOffset) * cellSize}
                    y={height - (y + yOffset) * cellSize}
                    width={cellWidth * cellSize}
                    height={cellHeight * cellSize}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={0.5}
                    opacity={opacity}>
                    <title>
                      {x},{y} - {cell.tag}
                      {cell.tag === "k" &&
                        ` (${cellWidth}x${cellHeight}) from ${cell.origin}${
                          cell.tile_tag ? `\nTag: ${cell.tile_tag}` : ""
                        }\nEdges: ${Object.entries(cell.edges)
                          .map(([k, v]) => `${k}:${v.edge}`)
                          .join(", ")}\n${Object.entries(cell.corners)
                          .map(([k, v]: any) => `${k}:${v.ground}`)
                          .join(", ")}`}
                      {cell.tag === "f" && `\nFill: ${cell.fill}`}
                    </title>
                  </rect>
                  {cell.tag === "k" && (
                    <Tile
                      x={x}
                      y={y}
                      posX={(x + xOffset) * cellSize}
                      posY={height - (y + yOffset) * cellSize}
                      room={arm}
                      graph={graph}
                      cellSize={cellSize}
                    />
                  )}
                </>
              ),
          ),
        )}
      </svg>
    </div>
  );
};
