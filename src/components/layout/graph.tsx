import React, { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Edge } from "components/layout/edge";
import { Rooms } from "components/layout/rooms";
import { Room, RoomJson, TileJson } from "components/layout/room";
import { Accordion } from "components/ui/accordion";
import { useLocation, useNavigate, useQueryParam } from "use-navigation-api";
import { Topology } from "types/world_areas";
import { processGraph, roomKey } from "lib/graph";
import { getLayout } from "queries/layout";

export const Graph: React.FC<
  ({ file: string; layout?: undefined } | { file?: undefined; layout: Topology }) & {
    addNodes: (names: Record<string, string[]>) => void;
    colorMap: Record<string, { color: string; strings: string[] }>;
    addRooms?: (rooms: string[], file: string) => void;
  }
> = ({ layout, file = layout?.file, colorMap, addNodes, addRooms }) => {
  const { data: graph, isPending, error } = useQuery(getLayout(file!));
  const navigation = useNavigate();
  const location = useLocation();
  const selectedRoom = useQueryParam("room");
  const selectedRoomFile = useQueryParam("roomFile");
  const setRoom = useCallback(
    (room: string) => {
      const next = location.clone();
      if (room) {
        next.setQuery("room", room);
        next.setQuery("graph", file);
      } else {
        next.removeQuery("room");
        next.setQuery("graph", file);
      }
      next.removeQuery("roomFile");
      next.removeQuery("node");
      navigation.navigate(String(next));
    },
    [location, navigation, file],
  );
  const [viewBox, scale, names] = useMemo(() => {
    if (!graph) return ["0 0 0 0", 1, {}];
    return processGraph(graph.nodes);
  }, [graph?.nodes]);
  useEffect(() => {
    if (names) addNodes(names);
  }, [names, addNodes]);
  useEffect(() => {
    if (!addRooms || !graph?.room_set) return;
    const rooms = graph.room_set.map((room: any) => room.room_tag).filter((room: string) => room);
    addRooms(rooms, file!);
  }, [addRooms, graph?.room_set, file]);

  const roomEntries = selectedRoom
    ? (graph?.room_set || []).filter((room: any) => room.room_tag === selectedRoom)
    : [];
  const selectedRoomEntry =
    roomEntries.find((room: any) => room.file === selectedRoomFile) || roomEntries[0] || null;
  const selectedTile = useQueryParam("tile");

  useEffect(() => {
    if (!selectedRoom || selectedRoomFile || !selectedRoomEntry) return;
    const next = location.clone().setQuery("roomFile", selectedRoomEntry.file);
    navigation.navigate(String(next), { history: "replace" });
  }, [location, navigation, selectedRoom, selectedRoomEntry, selectedRoomFile]);

  if (isPending) {
    return <div className="p-4 animate-pulse bg-slate-100 rounded-md">Loading graph...</div>;
  }

  if (error || !graph) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-900">
        <h3 className="text-sm font-bold">Error loading graph</h3>
        <p className="text-xs text-red-700 mt-1">
          Could not fetch layout data for <code>{file}</code>. It might be missing or the server
          might be down.
        </p>
      </div>
    );
  }

  if (!graph.nodes?.length) {
    return <>No data</>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-[2] overflow-hidden">
          <svg
            viewBox={viewBox}
            className="mx-auto block h-auto max-h-[80vh] w-auto max-w-full rounded-md border border-slate-200 bg-slate-900">
            {graph.edges.map((edge: Edge) => {
              return <Edge {...edge} graph={graph} scale={scale} key={`${edge.from}-${edge.to}`} />;
            })}
            {graph.nodes.map(({ x, y, room, strings }: any, i: number) => {
              const isSelected = selectedRoom === room;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={(room ? 4 : 3) * scale}
                  fill={colorMap[roomKey(room, strings)]?.color || "gray"}
                  stroke={isSelected ? "#f8fafc" : "none"}
                  strokeWidth={isSelected ? 2 * scale : 0}
                  onClick={() => setRoom(room)}
                  style={{ cursor: room ? "pointer" : "default" }}>
                  <title>
                    {room || ""}
                    {strings?.length ? '\n"' + strings.join('"\n"') + '"' : ""}
                  </title>
                </circle>
              );
            })}
          </svg>
        </div>
        <div className="flex-1">
          {selectedRoomEntry ? (
            <div>
              <p className="mb-1 text-xs text-slate-400">
                {selectedRoom} preview (work in progress)
              </p>
              <Room roomPath={selectedRoomEntry.file} graph={graph} cellSize={44} detailed />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-400/50 bg-slate-950/20 p-6 text-sm text-slate-400">
              Select a room to preview it here.
            </div>
          )}
        </div>
      </div>
      <Accordion title="Layout JSON">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-950 p-2 text-xs text-slate-100">
          {JSON.stringify(layout, undefined, 2)}
        </pre>
      </Accordion>
      <Accordion title="Graph JSON">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-950 p-2 text-xs text-slate-100">
          {JSON.stringify(graph, undefined, 2)}
        </pre>
      </Accordion>
      {selectedRoomEntry && (
        <Accordion title="Room JSON">
          <RoomJson roomPath={selectedRoomEntry.file} />
        </Accordion>
      )}
      {selectedTile && (
        <Accordion title="Tile JSON">
          {" "}
          <TileJson tilePath={selectedTile} />
        </Accordion>
      )}
      {selectedRoom && <Rooms tag={selectedRoom} graph={graph} />}
      {graph.subgraphs && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Subgraphs</h3>
          {Object.entries(graph.subgraphs).map(([k, v]) => (
            <div key={k} className="mt-3 space-y-2">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{k}</h4>
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
