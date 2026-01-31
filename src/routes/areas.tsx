import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Area } from "types/world_areas";
import { AreaDetails, LegendState } from "routes/area";
import { useQueryParam } from "use-navigation-api";
import React, { useState } from "react";
import { ColorLegend } from "components/layout/color-legend";

export const getAreas = queryOptions({
  queryKey: ["areas"],
  queryFn: (): Promise<Record<string, Area>> =>
    fetch("https://repoe-fork.github.io/poe2/world_areas.json").then((r) => r.json()),
});

export function AreasPage() {
  const selectedAreaId = useQueryParam("area");
  const query = useSuspenseQuery(getAreas);
  const areas = query.data;
  const selectedArea = selectedAreaId ? areas[selectedAreaId] : null;
  const [legendState, setLegendState] = useState<LegendState | null>(null);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1">
        {selectedArea ? <AreaDetails area={selectedArea} onLegendChange={setLegendState} /> : null}
      </div>
      <aside className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:w-72">
        {legendState ? (
          <div className="max-h-[75vh] overflow-auto">
            <ColorLegend
              title={legendState.title}
              items={legendState.items}
              onSelect={legendState.onSelect}
            />
          </div>
        ) : (
          <div className="text-sm text-slate-500">Select an area to see details.</div>
        )}
      </aside>
    </div>
  );
}
