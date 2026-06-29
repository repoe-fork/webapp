import React from "react";

export interface Edge {
  from: string;
  to: string;
  path: [number, number][];
  color?: string;
  edge_type: string;
}

export const Edge: React.FC<{ graph: any; scale: number } & Edge> = ({
  graph,
  from,
  to,
  path,
  scale,
  edge_type,
  color = "#80808080",
}) => {
  const start = graph.nodes[from];
  const end = graph.nodes[to];

  if (!start) console.log("no from node", from);
  if (!end) console.log("no to node", to);
  if (!start || !end) return null;

  return (
    <>
      <polyline
        points={`${start.x}, ${start.y} ${path.map(([x, y]: any) => `${x}, ${y}`).join(" ")} ${end.x}, ${end.y}`}
        strokeWidth={2 * scale}
        stroke="gray"
        fill="none"
      />
      <polyline
        points={`${start.x}, ${start.y} ${path.map(([x, y]: any) => `${x}, ${y}`).join(" ")} ${end.x}, ${end.y}`}
        strokeWidth={3 * scale}
        stroke={color}
        fill="none">
        {edge_type ? <title>{edge_type}</title> : <></>}
      </polyline>
    </>
  );
};
