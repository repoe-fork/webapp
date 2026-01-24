import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getAreas } from "./areas";
import { LayoutComponent } from "components/layout/layout";
import React, { useMemo, useState } from "react";
// @ts-ignore
import palette from "google-palette";

export const Route = createFileRoute("/areas/$area")({
  component: AreaComponent,
});

function AreaComponent() {
  const id = Route.useParams().area;
  const areas = useSuspenseQuery(getAreas).data;
  const area = areas[id];
  const [nodes, setNodes] = useState<Record<string, string[]>>({});

  const colorMap = useMemo(() => {
    const colors: string[] = [...palette("mpn65", Object.keys(nodes).length)];
    return Object.fromEntries(
      Object.entries(nodes).map(([key, strings], i) => [key, { color: "#" + colors[i], strings }]),
    );
  }, [nodes]);

  return (
    <div>
      <h3>{area.name}</h3>
      {area.topologies?.map((l) => (
        <LayoutComponent
          key={l.id}
          layout={l}
          colorMap={colorMap}
          addNodes={(added) => setNodes({ ...nodes, ...added })}
        />
      ))}
    </div>
  );
}
