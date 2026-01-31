import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Area } from "types/world_areas";
import { AreaDetails } from "./areas.$area";
import { useLocationWithParams, useQueryParam } from "use-navigation-api";

export const getAreas = queryOptions({
  queryKey: ["areas"],
  queryFn: (): Promise<Record<string, Area>> =>
    fetch("https://repoe-fork.github.io/poe2/world_areas.json").then((r) => r.json()),
});

const AreaLink = ({ id, name }: { id: string; name: string }) => {
  const href = useLocationWithParams({ tab: "areas", area: id });
  return (
    <li>
      <a
        href={href.href()}
        className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
        {name}
      </a>
    </li>
  );
};

export function AreasPage() {
  const selectedAreaId = useQueryParam("area");
  const query = useSuspenseQuery(getAreas);
  const areas = query.data;
  const selectedArea = selectedAreaId ? areas[selectedAreaId] : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1">{selectedArea ? <AreaDetails area={selectedArea} /> : null}</div>
      <aside className="w-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:w-72">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Areas
        </h2>
        <ul className="max-h-[70vh] space-y-1 overflow-auto">
          {Object.values(areas).map(({ id, name }) => (
            <AreaLink key={id} id={id} name={name} />
          ))}
        </ul>
      </aside>
    </div>
  );
}
