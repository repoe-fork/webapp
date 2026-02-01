import React from "react";
import { Topology } from "types/world_areas";
import { Graph } from "components/layout/graph";

export const LayoutComponent: React.FC<{
  layout: Topology;
  addNodes: (added: Record<string, string[]>) => void;
  colorMap: Record<string, { color: string; strings: string[] }>;
  addRooms?: (rooms: string[], file: string) => void;
}> = ({ layout, colorMap, addNodes, addRooms }) => {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-slate-900">{layout.file}</h4>
      <Graph layout={layout} colorMap={colorMap} addNodes={addNodes} addRooms={addRooms} />
    </div>
  );
};
