import { queryOptions } from "@tanstack/react-query";
import { parseTDT } from "lib/tdt";

export const getTDT = (filename: string) =>
  queryOptions({
    queryKey: ["tdt", { filename }],
    queryFn: () =>
      fetch(`https://ggpk.exposed/poe2/${filename}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch TDT ${filename}: ${r.statusText}`);
          return r.arrayBuffer();
        })
        .then(parseTDT),
  });