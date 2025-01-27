import * as React from 'react'
import { Link, Outlet, createRootRoute, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { AppBar, CssBaseline } from '@mui/material'
import { Context } from '../context'

export const Route = createRootRouteWithContext<Context>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <CssBaseline />
      <AppBar position="static">
        <Link
          to="/"
          activeProps={{
            className: 'font-bold',
          }}
          activeOptions={{ exact: true }}
        >
          Home
        </Link>
        <Link
          to="/areas"
          activeProps={{
            className: 'font-bold',
          }}
        >
          Areas
        </Link>
      </AppBar>
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}
