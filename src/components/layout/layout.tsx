import { queryOptions } from "@tanstack/react-query";
import React from "react";
import { Topology } from "types/world_areas";
import { Graph } from "components/layout/graph";
import { Accordion } from "components/ui/accordion";

export const getLayout = (filename: string) =>
  queryOptions({
    queryKey: ["layout", { filename }],
    queryFn: () =>
      fetch(`https://repoe-fork.github.io/poe2/${filename}.json`).then((r) => r.json()),
  });

export const LayoutComponent: React.FC<{
  layout: Topology;
  addNodes: (added: Record<string, string[]>) => void;
  colorMap: Record<string, { color: string; strings: string[] }>;
}> = ({ layout, colorMap, addNodes }) => {
  return (
    <div>
      <Accordion title={layout.file}>
        <pre className="whitespace-pre-wrap">{JSON.stringify(layout, undefined, 2)}</pre>
      </Accordion>
      <Graph file={layout.file} colorMap={colorMap} addNodes={addNodes} />
    </div>
  );
};
