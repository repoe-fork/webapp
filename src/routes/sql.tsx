import { SQLViewer } from "components/sql";
import { useQueryParam } from "use-navigation-api";

export function SqlPage() {
  const game = useQueryParam("game") || "poe1";
  const sequel = game === "poe2" ? "2" : "1";
  return (
    <SQLViewer
      url={`https://repoe-fork.github.io/dat-export/poe${sequel === "2" ? 2 : ""}/dat.sqlite`}
    />
  );
}
