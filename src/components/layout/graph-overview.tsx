import React, { useCallback, useEffect, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Edge } from "components/layout/edge";
import { Button } from "components/ui/button";
import { useLocation, useNavigate } from "use-navigation-api";
import { processGraph, roomKey, UNTAGGED_NODE } from "lib/graph";
import { getLayout } from "queries/layout";

export const GraphOverviewCard: React.FC<{
  file: string;
  addNodes: (names: Record<string, string[]>) => void;
  colorMap: Record<string, { color: string; strings: string[] }>;
  addRooms?: (rooms: string[], file: string) => void;
}> = ({ file, addNodes, colorMap, addRooms }) => {
  const graph = useSuspenseQuery(getLayout(file)).data;
  const navigation = useNavigate();
  const location = useLocation();
  const [viewBox, scale, names] = useMemo(() => processGraph(graph.nodes), [graph.nodes]);

  useEffect(() => void addNodes(names), [names, addNodes]);
  useEffect(() => {
    if (!addRooms || !graph.room_set) return;
    const rooms = graph.room_set.map((room: any) => room.room_tag).filter((room: string) => room);
    addRooms(rooms, file);
  }, [addRooms, graph.room_set, file]);

  const setFocus = useCallback(() => {
    const next = location.clone().setQuery("graph", file).removeQuery("room");
    navigation.navigate(String(next));
  }, [location, navigation, file]);

  const setRoom = useCallback(
    (room: string) => {
      const next = location.clone().setQuery("graph", file).setQuery("room", room);
      navigation.navigate(String(next));
    },
    [location, navigation, file],
  );

  if (!graph.nodes?.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{file}</p>
            <p className="text-xs text-slate-500">No nodes</p>
          </div>
          <Button variant="outline" onClick={setFocus}>
            Focus
          </Button>
        </div>
      </div>
    );
  }

  const roomCount = graph.room_set?.length ?? 0;
  const subgraphCount = graph.subgraphs ? Object.keys(graph.subgraphs).length : 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900" title={file}>
                {file.split("/").pop()}
              </p>
              <p className="text-xs text-slate-500">
                {roomCount} rooms · {graph.nodes.length} nodes · {graph.edges.length} edges
                {subgraphCount ? ` · ${subgraphCount} subgraphs` : ""}
              </p>
            </div>
            <Button variant="outline" onClick={setFocus}>
              Focus
            </Button>
          </div>
          <div className="mt-3 rounded-md border border-slate-200 bg-slate-900 p-2">
            <svg viewBox={viewBox} className="mx-auto block h-auto max-h-[60vh] w-auto max-w-full">
              {graph.edges.map((edge: Edge) => {
                return <Edge {...edge} graph={graph} scale={scale} key={`${edge.from}-${edge.to}`} />;
              })}
              {graph.nodes.map(({ x, y, room, strings }: any, i: number) => {
                const fill = colorMap[roomKey(room, strings)]?.color || "gray";
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={(room ? 4 : 3) * scale}
                    fill={fill}
                    onClick={() => room && setRoom(room)}
                    style={{ cursor: room ? "pointer" : "default" }}>
                    <title>
                      {room || UNTAGGED_NODE}
                      {strings?.length ? '\n"' + strings.join('"\n"') + '"' : ""}
                    </title>
                  </circle>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
