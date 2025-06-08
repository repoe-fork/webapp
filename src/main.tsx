import { QueryClientProvider } from "@tanstack/react-query";
import { createHashHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";
import { context } from "context";
import { routeTree } from "routeTree.gen";
import { CssBaseline } from "@mui/material";

const history = createHashHistory();

// Set up a Router instance
const router = createRouter({
  routeTree,
  context,
  history,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});

// Register things for typesafety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <QueryClientProvider client={context.queryClient}>
      <CssBaseline />
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}
