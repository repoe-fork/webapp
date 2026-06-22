import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Area } from "types/world_areas";
import { AreaDetails, LegendState } from "routes/area";
import { useQueryParam } from "use-navigation-api";
import React, { useState } from "react";
import { ColorLegend } from "components/layout/color-legend";
import { Accordion } from "components/ui/accordion";

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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex-1">
        {selectedArea ? <AreaDetails area={selectedArea} onLegendChange={setLegendState} /> : null}
      </div>

      <aside className="w-full shrink-0 lg:w-72 lg:sticky lg:top-4">
        {legendState ? (
          <>
            {/* Mobile collapsible legend */}
            <div className="sticky top-0 z-10 bg-slate-50 py-2 lg:hidden">
              <Accordion title={legendState.title}>
                <div className="max-h-[60vh] overflow-auto">
                  <ColorLegend
                    title={legendState.title}
                    items={legendState.items}
                    onSelect={legendState.onSelect}
                  />
                </div>
              </Accordion>
            </div>

            {/* Desktop permanent legend */}
            <div className="hidden lg:block rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="max-h-[75vh] overflow-auto">
                <ColorLegend
                  title={legendState.title}
                  items={legendState.items}
                  onSelect={legendState.onSelect}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm text-sm text-slate-500">
            Select an area to see details.
          </div>
        )}
      </aside>
    </div>
  );
}
