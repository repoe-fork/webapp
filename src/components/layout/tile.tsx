import React from "react";
import { ARMFile } from "lib/arm";

export const Tile: React.FC<{
  x: number;
  y: number;
  room: ARMFile;
  graph: any;
  cellSize: number;
}> = ({ x, y, room, graph, cellSize }) => {
  const cell = room.grid[y][x];
  if (cell.tag !== "k") return null;
  const cellWidth = cell.width * cellSize;
  const cellHeight = cell.height * cellSize;
  return (
    <title>
      {x},{y} - {cell.tag} ({cellWidth}x{cellHeight})
      {` from ${cell.origin}${
        cell.tile_tag ? `\nTag: ${cell.tile_tag}` : ""
      }\nEdges: ${Object.entries(cell.edges)
        .map(([k, v]) => `${k}:${v.edge}`)
        .join(", ")}\n${Object.entries(cell.corners)
        .map(([k, v]: any) => `${k}:${v.ground}`)
        .join(", ")}`}
    </title>
  );
};
