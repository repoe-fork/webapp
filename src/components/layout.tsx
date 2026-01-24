import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import "color-legend-element";
import { Topology } from "types/world_areas";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import { parseARM } from "../lib/arm";

export const getLayout = (filename: string) =>
  queryOptions({
    queryKey: ["layout", { filename }],
    queryFn: () =>
      fetch(`https://repoe-fork.github.io/poe2/${filename}.json`).then((r) => r.json()),
  });

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

const Rooms: React.FC<{ tag: string; graph: any }> = ({ tag, graph }) => {
  return (
    <div>
      <h3>{tag}</h3>
      {graph.room_set
        .filter(({ room_tag }: any) => room_tag === tag)
        .map((room: any) => (
          <React.Suspense fallback={<Typography>Loading room...</Typography>}>
            <RoomSVG key={room.file} roomPath={room.file} />
          </React.Suspense>
        ))}
    </div>
  );
};

const RoomSVG: React.FC<{ roomPath: string }> = ({ roomPath }) => {
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

function parseRoomKey(key: string) {
  if (!key || key === UNTAGGED_NODE) return undefined;
  return key
    .split('"')[0]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

const UNTAGGED_NODE = "<unknown>";
const Graph: React.FC<{
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

export const LayoutComponent: React.FC<{
  layout: Topology;
  addNodes: (added: Record<string, string[]>) => void;
  colorMap: Record<string, { color: string; strings: string[] }>;
}> = ({ layout, colorMap, addNodes }) => {
  return (
    <div>
      <Accordion>
        <AccordionSummary>{layout.file}</AccordionSummary>
        <AccordionDetails>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(layout, undefined, 2)}</pre>
        </AccordionDetails>
      </Accordion>
      <Graph file={layout.file} colorMap={colorMap} addNodes={addNodes} />
    </div>
  );
};
