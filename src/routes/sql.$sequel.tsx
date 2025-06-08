import { SQLViewer } from "components/sql";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sql/$sequel")({
  component: SqlComponent,
});

function SqlComponent() {
  const sequel = Route.useParams().sequel;
  return (
    <SQLViewer
      url={`https://repoe-fork.github.io/dat-export/poe${sequel === "2" ? 2 : ""}/dat.sqlite`}
    />
  );
}
