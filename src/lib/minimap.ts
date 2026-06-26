import { queryOptions } from "@tanstack/react-query";
import { parseMTP } from "lib/mtp";

export const getSpriteSheet = (filename: string, game: string) =>
  queryOptions({
    queryKey: ["spritesheet", { filename, game }],
    queryFn: () =>
      fetch(`https://ggpk.exposed/${game === "poe2" ? "poe2" : "poe1"}/minimap/${filename}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to fetch sprite sheet ${filename}: ${r.statusText}`);
          return r.arrayBuffer();
        })
        .then(parseMTP),
  });
