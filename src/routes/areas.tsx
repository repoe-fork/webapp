import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Area } from "types/world_areas";
import { AreaDetails, LegendState } from "routes/area";
import { useQueryParam } from "use-navigation-api";
import React, { useState } from "react";
import { ColorLegend } from "components/layout/color-legend";
import { Accordion } from "components/ui/accordion";
import { useAtom } from "jotai";
import { headerHeight } from "../state/headerHeight";

export const getAreas = (game: string, version?: string) =>
  queryOptions({
    queryKey: ["areas", { game, version }],
    queryFn: (): Promise<Record<string, Area>> =>
      fetch(
        `https://repoe-fork.github.io/${game === "poe2" ? (version ? `poe2-${version}/` : "poe2/") : ""}world_areas.json`,
      ).then((r) => r.json()),
  });

export function AreasPage() {
  const [top] = useAtom(headerHeight);
  const selectedAreaId = useQueryParam("area");
  const game = useQueryParam("game") === "poe2" ? "poe2" : "poe1";
  const version = useQueryParam("version");
  const query = useSuspenseQuery(getAreas(game, version));
  const areas = query.data;
  const selectedArea = selectedAreaId ? areas[selectedAreaId] : null;
  const [legendState, setLegendState] = useState<LegendState | null>(null);

  return (
    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-72 lg:sticky lg:top-4 lg:order-last">
        {legendState ? (
          <>
            {/* Mobile collapsible legend */}
            <div
              className="fixed left-0 right-0 z-20 bg-slate-50/95 backdrop-blur-sm px-4 py-2 lg:hidden"
              style={{ top }}>
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
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm text-sm text-slate-500 lg:block hidden">
            Select an area to see details.
          </div>
        )}
      </aside>

      <div className="flex-1 lg:mt-0 mt-8">
        {selectedArea ? <AreaDetails area={selectedArea} onLegendChange={setLegendState} /> : null}
      </div>
    </div>
  );
}
