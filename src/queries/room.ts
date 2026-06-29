import { queryOptions } from "@tanstack/react-query";
import { parseARM } from "lib/arm";

export const getRoom = (filename: string, game: string) =>
  queryOptions({
    queryKey: ["room", { filename, game }],
    queryFn: () =>
      fetch(`https://ggpk.exposed/${game === "poe2" ? "poe2" : "poe1"}/${filename}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch room: ${r.statusText}`);
          return r.text();
        })
        .then(parseARM),
  });
