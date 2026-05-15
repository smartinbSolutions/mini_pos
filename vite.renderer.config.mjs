import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    {
      name: "load-js-files-as-jsx",
      enforce: "pre",
      async transform(code, id) {
        if (!id.match(/src\/frontend\/src\/.*\.(js|jsx)$/)) return null;

        return transformWithEsbuild(code, id, {
          loader: "jsx",
          jsx: "automatic",
        });
      },
    },
    react(),
  ],
  esbuild: {
    loader: "jsx",
    include: /src\/frontend\/src\/.*\.(js|jsx)$/,
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
});
