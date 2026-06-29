import { queryOptions } from "@tanstack/react-query";
import { parseTDT } from "lib/tdt";

export const getTDT = (filename: string, game: string) =>
  queryOptions({
    queryKey: ["tdt", { filename, game }],
    queryFn: () =>
      fetch(`https://ggpk.exposed/${game === "poe2" ? "poe2" : "poe1"}/${filename}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch TDT ${filename}: ${r.statusText}`);
          return r.arrayBuffer();
        })
        .then(parseTDT),
  });
