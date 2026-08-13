// vite.renderer.config.mjs
import { defineConfig, transformWithEsbuild } from "file:///Users/muhannad/Desktop/mini_pos/node_modules/vite/dist/node/index.js";
import path from "node:path";
import { createRequire } from "node:module";
var frontendRequire = createRequire(
  path.resolve("src/frontend/package.json")
);
var tailwindcss = frontendRequire("tailwindcss");
var autoprefixer = frontendRequire("autoprefixer");
var vite_renderer_config_default = defineConfig({
  plugins: [
    {
      name: "load-js-files-as-jsx",
      enforce: "pre",
      async transform(code, id) {
        if (!id.match(/src\/frontend\/src\/.*\.(js|jsx)$/)) return null;
        return transformWithEsbuild(code, id, {
          loader: "jsx",
          jsx: "automatic"
        });
      }
    }
  ],
  esbuild: {
    loader: "jsx",
    include: /src\/frontend\/src\/.*\.(js|jsx)$/
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx"
      }
    }
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          config: path.resolve("src/frontend/tailwind.config.js")
        }),
        autoprefixer()
      ]
    }
  }
});
export {
  vite_renderer_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5yZW5kZXJlci5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL211aGFubmFkL0Rlc2t0b3AvbWluaV9wb3NcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tdWhhbm5hZC9EZXNrdG9wL21pbmlfcG9zL3ZpdGUucmVuZGVyZXIuY29uZmlnLm1qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbXVoYW5uYWQvRGVza3RvcC9taW5pX3Bvcy92aXRlLnJlbmRlcmVyLmNvbmZpZy5tanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIHRyYW5zZm9ybVdpdGhFc2J1aWxkIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tIFwibm9kZTptb2R1bGVcIjtcblxuY29uc3QgZnJvbnRlbmRSZXF1aXJlID0gY3JlYXRlUmVxdWlyZShcbiAgcGF0aC5yZXNvbHZlKFwic3JjL2Zyb250ZW5kL3BhY2thZ2UuanNvblwiKSxcbik7XG5jb25zdCB0YWlsd2luZGNzcyA9IGZyb250ZW5kUmVxdWlyZShcInRhaWx3aW5kY3NzXCIpO1xuY29uc3QgYXV0b3ByZWZpeGVyID0gZnJvbnRlbmRSZXF1aXJlKFwiYXV0b3ByZWZpeGVyXCIpO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAge1xuICAgICAgbmFtZTogXCJsb2FkLWpzLWZpbGVzLWFzLWpzeFwiLFxuICAgICAgZW5mb3JjZTogXCJwcmVcIixcbiAgICAgIGFzeW5jIHRyYW5zZm9ybShjb2RlLCBpZCkge1xuICAgICAgICBpZiAoIWlkLm1hdGNoKC9zcmNcXC9mcm9udGVuZFxcL3NyY1xcLy4qXFwuKGpzfGpzeCkkLykpIHJldHVybiBudWxsO1xuXG4gICAgICAgIHJldHVybiB0cmFuc2Zvcm1XaXRoRXNidWlsZChjb2RlLCBpZCwge1xuICAgICAgICAgIGxvYWRlcjogXCJqc3hcIixcbiAgICAgICAgICBqc3g6IFwiYXV0b21hdGljXCIsXG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICB9LFxuICBdLFxuICBlc2J1aWxkOiB7XG4gICAgbG9hZGVyOiBcImpzeFwiLFxuICAgIGluY2x1ZGU6IC9zcmNcXC9mcm9udGVuZFxcL3NyY1xcLy4qXFwuKGpzfGpzeCkkLyxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXNidWlsZE9wdGlvbnM6IHtcbiAgICAgIGxvYWRlcjoge1xuICAgICAgICBcIi5qc1wiOiBcImpzeFwiLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBjc3M6IHtcbiAgICBwb3N0Y3NzOiB7XG4gICAgICBwbHVnaW5zOiBbXG4gICAgICAgIHRhaWx3aW5kY3NzKHtcbiAgICAgICAgICBjb25maWc6IHBhdGgucmVzb2x2ZShcInNyYy9mcm9udGVuZC90YWlsd2luZC5jb25maWcuanNcIiksXG4gICAgICAgIH0pLFxuICAgICAgICBhdXRvcHJlZml4ZXIoKSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzUyxTQUFTLGNBQWMsNEJBQTRCO0FBQ3pWLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUU5QixJQUFNLGtCQUFrQjtBQUFBLEVBQ3RCLEtBQUssUUFBUSwyQkFBMkI7QUFDMUM7QUFDQSxJQUFNLGNBQWMsZ0JBQWdCLGFBQWE7QUFDakQsSUFBTSxlQUFlLGdCQUFnQixjQUFjO0FBR25ELElBQU8sK0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixTQUFTO0FBQUEsTUFDVCxNQUFNLFVBQVUsTUFBTSxJQUFJO0FBQ3hCLFlBQUksQ0FBQyxHQUFHLE1BQU0sbUNBQW1DLEVBQUcsUUFBTztBQUUzRCxlQUFPLHFCQUFxQixNQUFNLElBQUk7QUFBQSxVQUNwQyxRQUFRO0FBQUEsVUFDUixLQUFLO0FBQUEsUUFDUCxDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxRQUFRO0FBQUEsSUFDUixTQUFTO0FBQUEsRUFDWDtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osZ0JBQWdCO0FBQUEsTUFDZCxRQUFRO0FBQUEsUUFDTixPQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxLQUFLO0FBQUEsSUFDSCxTQUFTO0FBQUEsTUFDUCxTQUFTO0FBQUEsUUFDUCxZQUFZO0FBQUEsVUFDVixRQUFRLEtBQUssUUFBUSxpQ0FBaUM7QUFBQSxRQUN4RCxDQUFDO0FBQUEsUUFDRCxhQUFhO0FBQUEsTUFDZjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
