import { queryOptions } from "@tanstack/react-query";
import { parseMTP } from "lib/mtp";

export const getSpriteSheet = (filename: string) =>
  queryOptions({
    queryKey: ["spritesheet", { filename }],
    queryFn: () =>
      fetch(`https://ggpk.exposed/poe2/minimap/${filename}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch sprite sheet ${filename}: ${r.statusText}`);
          return r.arrayBuffer();
        })
        .then(parseMTP),
  });
