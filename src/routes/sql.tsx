import { SQLViewer } from "components/sql";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sql")({
  component: SqlComponent,
});

function SqlComponent() {
  return <SQLViewer url={"https://repoe-fork.github.io/dat-export/poe/dat.sqlite"} />;
}
