import * as React from "react";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
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
          to="/sql"
          activeProps={{
            className: "font-bold",
          }}>
          Sql (poe1)
        </Link>
      </AppBar>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  );
}
