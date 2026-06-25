/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import TsConfig from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/webapp",
  plugins: [TsConfig(), react()],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/.{idea,git,cache,output,temp}/**"],
  },
});
