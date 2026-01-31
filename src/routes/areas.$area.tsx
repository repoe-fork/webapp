import { LayoutComponent } from "components/layout/layout";
import React, { useMemo, useState } from "react";
// @ts-ignore
import palette from "google-palette";
import { Area } from "types/world_areas";

export function AreaDetails({ area }: { area: Area }) {
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
