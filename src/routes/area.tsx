import { LayoutComponent } from "components/layout/layout";
import { GraphOverviewCard } from "components/layout/graph-overview";
import { Button } from "components/ui/button";
import React, { useCallback, useEffect, useMemo, useState } from "react";
// @ts-ignore
import palette from "google-palette";
import { Area } from "types/world_areas";
import { useLocation, useNavigate, useQueryParam } from "use-navigation-api";
import { ColorLegendItem } from "components/layout/color-legend";

const UNTAGGED_NODE = "<unknown>";

export type LegendState = {
  title: string;
  items: ColorLegendItem[];
  onSelect: (label: string) => void;
};

export function AreaDetails({
  area,
  onLegendChange,
}: {
  area: Area;
  onLegendChange?: (legend: LegendState | null) => void;
}) {
  const [nodes, setNodes] = useState<Record<string, string[]>>({});
  const [roomIndex, setRoomIndex] = useState<Record<string, string>>({});
  const selectedGraph = useQueryParam("graph");
  const selectedRoom = useQueryParam("room");
  const location = useLocation();
  const navigation = useNavigate();

  const colorMap = useMemo(() => {
    const colors: string[] = [...palette("mpn65", Object.keys(nodes).length)];
    return Object.fromEntries(
      Object.entries(nodes).map(([key, strings], i) => [key, { color: "#" + colors[i], strings }]),
    );
  }, [nodes]);

  const layouts = area.topologies ?? [];
  const layoutOrder = useMemo(
    () => Object.fromEntries(layouts.map((layout, index) => [layout.file, index])),
    [layouts],
  );
  const focusedLayout = selectedGraph
    ? layouts.find((layout) => layout.file === selectedGraph)
    : null;

  const clearFocus = () => {
    const next = location.clone().removeQuery("graph").removeQuery("room");
    navigation.navigate(String(next));
  };

  const addRooms = (rooms: string[], file: string) => {
    setRoomIndex((prev) => {
      const next = { ...prev };
      const order = layoutOrder[file] ?? Number.POSITIVE_INFINITY;
      for (const room of rooms) {
        const existing = next[room];
        const existingOrder = existing ? layoutOrder[existing] ?? Number.POSITIVE_INFINITY : null;
        if (!existing || (existingOrder !== null && order < existingOrder)) {
          next[room] = file;
        }
      }
      return next;
    });
  };

  const legendItems = useMemo<ColorLegendItem[]>(() => {
    return Object.keys(nodes)
      .map((name) => ({
        label: name || UNTAGGED_NODE,
        color: colorMap[name]?.color || "gray",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [nodes, colorMap]);

  const handleLegendSelect = useCallback(
    (label: string) => {
      if (!label || label === UNTAGGED_NODE) return;
      const room = label.split('"')[0].trim();
      if (!room) return;
      const graphFile = roomIndex[room];
      if (!graphFile) return;
      const next = location
        .clone()
        .setQuery("graph", graphFile)
        .setQuery("room", room)
        .removeQuery("roomFile");
      navigation.navigate(String(next));
    },
    [location, navigation, roomIndex],
  );

  const legendState = useMemo(
    () => ({
      title: "Room legend",
      items: legendItems,
      onSelect: handleLegendSelect,
    }),
    [handleLegendSelect, legendItems],
  );

  useEffect(() => {
    onLegendChange?.(legendState);
    return () => onLegendChange?.(null);
  }, [legendState, onLegendChange]);

  useEffect(() => {
    if (!selectedRoom || selectedGraph) return;
    const graphFile = roomIndex[selectedRoom];
    if (!graphFile) return;
    const next = location
      .clone()
      .setQuery("graph", graphFile)
      .setQuery("room", selectedRoom)
      .removeQuery("roomFile");
    navigation.navigate(String(next));
  }, [location, navigation, roomIndex, selectedGraph, selectedRoom]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{area.name}</h3>
          <p className="text-sm text-slate-500">
            {layouts.length} graph{layouts.length === 1 ? "" : "s"}
            {selectedRoom ? ` · focused room: ${selectedRoom}` : ""}
          </p>
        </div>
        {focusedLayout && (
          <Button variant="outline" onClick={clearFocus}>
            All graphs
          </Button>
        )}
      </div>

      {focusedLayout ? (
        <LayoutComponent
          key={focusedLayout.id}
          layout={focusedLayout}
          colorMap={colorMap}
          addNodes={(added) => setNodes((prev) => ({ ...prev, ...added }))}
          addRooms={addRooms}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {layouts.map((layout) => (
            <GraphOverviewCard
              key={layout.id}
              file={layout.file}
              colorMap={colorMap}
              addNodes={(added) => setNodes((prev) => ({ ...prev, ...added }))}
              addRooms={addRooms}
            />
          ))}
        </div>
      )}
    </div>
  );
}
