import { Drawer, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
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
  const href = useLocationWithParams({ tab: "areas", area: id, game: null });
  return (
    <ListItem disablePadding>
      <ListItemButton component="a" href={href}>
        <ListItemText primary={name} />
      </ListItemButton>
    </ListItem>
  );
};

export function AreasPage() {
  const selectedAreaId = useQueryParam("area");
  const query = useSuspenseQuery(getAreas);
  const areas = query.data;
  const selectedArea = selectedAreaId ? areas[selectedAreaId] : null;

  return (
    <div className="p-2">
      <Drawer variant="persistent" anchor="right" open>
        <List>
          {Object.values(areas).map(({ id, name }) => (
            <AreaLink key={id} id={id} name={name} />
          ))}
        </List>
      </Drawer>
      {selectedArea ? <AreaDetails area={selectedArea} /> : null}
    </div>
  );
}
