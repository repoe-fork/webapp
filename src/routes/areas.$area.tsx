import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getAreas } from "./areas";
import { LayoutComponent } from "components/layout";

export const Route = createFileRoute("/areas/$area")({
  component: AreaComponent,
});

function AreaComponent() {
  const id = Route.useParams().area;
  const areas = useSuspenseQuery(getAreas).data;
  const area = areas[id];
  return (
    <div>
      <h3>{area.name}</h3>
      {area.topologies?.map((l) => <LayoutComponent key={l.id} layout={l} />)}
    </div>
  );
}
