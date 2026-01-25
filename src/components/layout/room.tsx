import React from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Typography } from "@mui/material";
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

  if (error) return <Typography color="error">Error loading room</Typography>;
  if (!arm) return null;

  const cellSize = 10;
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
    <div style={{ padding: "8px", backgroundColor: "#333", borderRadius: "4px" }}>
      <Typography variant="caption" sx={{ color: "#ccc", display: "block", mb: 0.5 }}>
        {roomPath.split("/").pop()} ({arm.root_slot.width}x{arm.root_slot.height})
      </Typography>
      <svg viewBox={viewBox} style={{ width: "100%", maxWidth: viewWidth * 2, display: "block" }}>
        {cells.map((row, y) =>
          row.map(
            ({ cell, fill, stroke, opacity, cellWidth, cellHeight, xOffset, yOffset, skip }, x) =>
              skip ? null : (
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
                  {cell.tag === "k" ? (
                    <Tile x={x} y={y} room={arm} graph={graph} cellSize={cellSize} />
                  ) : (
                    <title>
                      {x},{y} - {cell.tag} ({cellWidth}x{cellHeight})
                      {cell.tag === "f" && `\nFill: ${cell.fill}`}
                    </title>
                  )}
                </rect>
              ),
          ),
        )}
      </svg>
    </div>
  );
};
