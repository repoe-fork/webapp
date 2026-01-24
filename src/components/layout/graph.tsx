import React, { useEffect, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Edge } from "components/layout/edge";
import { Rooms } from "components/layout/rooms";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import { getLayout } from "components/layout/layout";

function roomKey(room: string, strings?: string[]) {
  return strings?.length ? `${room} "${strings.join('" "')}"` : room;
}

function parseRoomKey(key: string) {
  if (!key || key === UNTAGGED_NODE) return undefined;
  return key
    .split('"')[0]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const UNTAGGED_NODE = "<unknown>";
export const Graph: React.FC<{
  file: string;
  addNodes: (names: Record<string, string[]>) => void;
  colorMap: Record<string, { color: string; strings: string[] }>;
}> = ({ file, colorMap, addNodes }) => {
  const graph = useSuspenseQuery(getLayout(file)).data;
  const [roomTags, setRoomTags] = useState<string[]>();
  const [viewBox, scale, names] = useMemo(() => {
    return processGraph(graph.nodes);
  }, [graph.nodes]);
  useEffect(() => void addNodes(names), [names]);
  const [domain, range] = useMemo(() => {
    const domain = [],
      range = [];
    for (const name of Object.keys(names)) {
      domain.push(name || UNTAGGED_NODE);
      range.push(colorMap[name]?.color || "gray");
    }
    return [domain, range];
  }, [names, colorMap]);

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
                fill={colorMap[roomKey(room, strings)]?.color || "gray"}
                onClick={() => setRoomTags([room, ...(strings || [])])}
                style={{ cursor: room ? "pointer" : "default" }}>
                <title>
                  {room || ""}
                  {strings?.length ? '\n"' + strings.join('"\n"') + '"' : ""}
                </title>
              </circle>
            ))}
          </svg>
          {roomTags?.map((tag) => (
            <Rooms key={tag} tag={tag} graph={graph} />
          ))}
        </div>
        <div style={{ maxWidth: "50%" }}>
          {/* @ts-ignore */}
          <color-legend
            titleText={file}
            scaleType="categorical"
            domain={domain}
            range={range}
            onClick={(e: React.MouseEvent) => {
              const li = e.nativeEvent
                .composedPath()
                .find((el) => (el as HTMLElement).tagName === "LI");
              if (li) {
                setRoomTags(parseRoomKey((li as HTMLElement).textContent.trim()));
              }
            }}
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
  if (min[0] === max[0]) {
    min[0] = 0;
    max[0] = max[0] * 2;
  }
  if (min[1] === max[1]) {
    min[1] = 0;
    max[1] = max[1] * 2;
  }
  return [`0 0 ${max[0] + min[0]} ${max[1] + min[1]}`, (max[0] - min[0]) / 200, names] as const;
}
