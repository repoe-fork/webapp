import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <div className="p-2">
      <h3>Nothing to see here, yet</h3>
      <p>Some day this will be a helper webapp for exploring repoe data</p>
    </div>
  );
}
