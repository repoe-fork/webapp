import * as React from "react";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { AppBar } from "@mui/material";
import { Context } from "context";

export const Route = createRootRouteWithContext<Context>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <AppBar position="static">
        <Link
          to="/"
          activeProps={{
            className: "font-bold",
          }}
          activeOptions={{ exact: true }}>
          Home
        </Link>
        <Link
          to="/areas"
          activeProps={{
            className: "font-bold",
          }}>
          Areas
        </Link>
        <Link
          to="/sql/$sequel"
          params={{ sequel: "1" }}
          activeProps={{
            className: "font-bold",
          }}>
          poe1 sqlite
        </Link>
        <Link
          to="/sql/$sequel"
          params={{ sequel: "2" }}
          activeProps={{
            className: "font-bold",
          }}>
          poe2 sqlite
        </Link>
      </AppBar>
      <Outlet />
    </>
  );
}
