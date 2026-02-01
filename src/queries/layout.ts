import { queryOptions } from "@tanstack/react-query";

export const getLayout = (filename: string) =>
  queryOptions({
    queryKey: ["layout", { filename }],
    queryFn: () =>
      fetch(`https://repoe-fork.github.io/poe2/${filename}.json`).then((r) => r.json()),
  });