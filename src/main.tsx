import { QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom/client";
import { context } from "context";
import { NavigationProvider } from "use-navigation-api";
import { App } from "app";

const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <QueryClientProvider client={context.queryClient}>
      <NavigationProvider>
        <App />
      </NavigationProvider>
    </QueryClientProvider>,
  );
}
