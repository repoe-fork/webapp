import { queryOptions } from "@tanstack/react-query";

export const getLayout = (filename: string, game: string, version?: string) =>
  queryOptions({
    queryKey: ["layout", { filename, game, version }],
    queryFn: () =>
      fetch(`https://repoe-fork.github.io/${game === "poe2" ? (version ? `poe2-${version}/` : "poe2/") : ""}${filename}.json`).then((r) => r.json()),
  });