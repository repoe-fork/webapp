import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/webapp",
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/.{idea,git,cache,output,temp}/**"],
  },
});
