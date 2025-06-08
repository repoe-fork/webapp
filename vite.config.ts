import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import TsConfig from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/webapp",
  plugins: [TsConfig(), TanStackRouterVite({}), react()],
});
