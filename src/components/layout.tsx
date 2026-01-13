import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import "color-legend-element";
// @ts-ignore
import palette from "google-palette";
import { Topology } from "types/world_areas";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";

export const getLayout = (filename: string) =>
  queryOptions({
    queryKey: ["layout", { filename }],
    queryFn: () =>
      fetch(`https://repoe-fork.github.io/poe2/${filename}.json`).then((r) => r.json()),
  });

export interface Edge {
  from: string;
  to: string;
  path: [number, number][];
  color?: string;
  edge_type: string;
}

function roomKey(room: string, strings?: string[]) {
  return strings?.length ? `${room} "${strings.join('" "')}"` : room;
}

const Edge: React.FC<{ graph: any; scale: number } & Edge> = ({
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

const Graph: React.FC<{
  file: string;
  addNodes: (names: Record<string, string[]>) => void;
  colorMap: Record<string, { color: string; strings: string[] }>;
}> = ({ file, colorMap, addNodes }) => {
  const graph = useSuspenseQuery(getLayout(file)).data;
  const [viewBox, scale, names] = useMemo(() => {
    return processGraph(graph.nodes);
  }, [graph.nodes]);
  useEffect(() => void addNodes(names), [names]);

  if (!graph.nodes?.length) {
    return <>No data</>;
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "row" }}>
        <div style={{ maxWidth: "500px", margin: "5px" }}>
          <svg viewBox={viewBox} style={{ width: "100%", backgroundColor: "#222" }}>
            {graph.edges.map((edge: Edge) => {
              return <Edge {...edge} graph={graph} scale={scale} key={`${edge.from}-${edge.to}`} />;
            })}
            {graph.nodes.map(({ x, y, room, strings }: any, i: number) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={(room ? 4 : 3) * scale}
                fill={colorMap[roomKey(room, strings)].color}>
                <title>
                  {room || ""}
                  {strings?.length ? '\n"' + strings.join('"\n"') + '"' : ""}
                </title>
              </circle>
            ))}
          </svg>
        </div>
        <div style={{ maxWidth: "50%" }}>
          {/* @ts-ignore */}
          <color-legend
            titleText={file}
            scaleType="categorical"
            domain={Object.keys(colorMap).map((k) => k || "<unknown>")}
            range={Object.values(colorMap).map(({ color }) => color)}
          />
          <Accordion>
            <AccordionSummary>graph</AccordionSummary>
            <AccordionDetails>
              <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(graph, undefined, 2)}</pre>
            </AccordionDetails>
          </Accordion>
        </div>
      </div>
      {graph.subgraphs && (
        <div>
          <h3>Subgraphs</h3>
          {Object.entries(graph.subgraphs).map(([k, v]) => (
            <div>
              <h4>{k}</h4>
              {(v as any[]).map((f) => (
                <Graph key={f} file={f} addNodes={addNodes} colorMap={colorMap} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function processGraph(nodes: any[]) {
  const names: Record<string, string[]> = {};
  const min = [Infinity, Infinity],
    max = [-Infinity, -Infinity];
  for (let { x, y, room, strings } of nodes || []) {
    names[roomKey(room, strings)] = strings;
    min[0] = Math.min(min[0], x);
    min[1] = Math.min(min[1], y);
    max[0] = Math.max(max[0], x);
    max[1] = Math.max(max[1], y);
  }
  if (min[0] === max[0]) min[0] = 0;
  if (min[1] === max[1]) min[1] = 0;
  return [`0 0 ${max[0] + min[0]} ${max[1] + min[1]}`, (max[0] - min[0]) / 200, names] as const;
}

export const LayoutComponent: React.FC<{ layout: Topology }> = ({ layout }) => {
  const [nodes, setNodes] = useState<Record<string, string[]>>({});

  const colorMap = useMemo(() => {
    const colors: string[] = [...palette("mpn65", Object.keys(nodes).length)];
    return Object.fromEntries(
      Object.entries(nodes).map(([key, strings], i) => [key, { color: "#" + colors[i], strings }]),
    );
  }, [nodes]);

  return (
    <div>
      <Accordion>
        <AccordionSummary>{layout.file}</AccordionSummary>
        <AccordionDetails>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(layout, undefined, 2)}</pre>
        </AccordionDetails>
      </Accordion>
      <Graph
        file={layout.file}
        colorMap={colorMap}
        addNodes={(added) => setNodes({ ...nodes, ...added })}
      />
    </div>
  );
};
