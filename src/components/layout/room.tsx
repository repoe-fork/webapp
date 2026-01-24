import React from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Typography } from "@mui/material";
import { parseARM } from "lib/arm";

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

export const Room: React.FC<{ roomPath: string }> = ({ roomPath }) => {
  const { data: arm, error } = useSuspenseQuery(getRoom(roomPath));

  if (error) return <Typography color="error">Error loading room</Typography>;
  if (!arm) return null;

  const cellSize = 10;
  const width = arm.root_slot.width * cellSize;
  const height = arm.root_slot.height * cellSize;

  return (
    <div style={{ padding: "8px", backgroundColor: "#333", borderRadius: "4px" }}>
      <Typography variant="caption" sx={{ color: "#ccc", display: "block", mb: 0.5 }}>
        {roomPath.split("/").pop()} ({arm.root_slot.width}x{arm.root_slot.height})
      </Typography>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", maxWidth: width * 2, display: "block" }}>
        {arm.grid.map((row, y) =>
          row.map((cell, x) => {
            let fill = "none";
            let stroke = "#444";
            let opacity = 0.8;
            let cellWidth = 1;
            let cellHeight = 1;
            // Y-coordinate system of svg is inverted relative to the grid
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
                return null;
            }

            return (
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
                  {x},{y} - {cell.tag.toUpperCase()} ({cellWidth}x{cellHeight})
                  {cell.tag === "k" &&
                    ` from ${cell.origin}\nEdges: ${Object.entries(cell.edges)
                      .map(([k, v]) => `${k}:${v.edge}`)
                      .join(", ")}\n${Object.entries(cell.corners)
                      .map(([k, v]) => `${k}:${v.ground}`)
                      .join(", ")}`}
                  {cell.tag === "f" && `\nFill: ${cell.fill}`}
                </title>
              </rect>
            );
          }),
        )}
      </svg>
    </div>
  );
};
