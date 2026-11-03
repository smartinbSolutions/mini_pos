// vite.renderer.config.mjs
import { defineConfig, transformWithEsbuild } from "file:///C:/Users/ASUS/Documents/GitHub/noonmar-project/POS/mini_pos/node_modules/vite/dist/node/index.js";
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5yZW5kZXJlci5jb25maWcubWpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcQVNVU1xcXFxEb2N1bWVudHNcXFxcR2l0SHViXFxcXG5vb25tYXItcHJvamVjdFxcXFxQT1NcXFxcbWluaV9wb3NcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXEFTVVNcXFxcRG9jdW1lbnRzXFxcXEdpdEh1YlxcXFxub29ubWFyLXByb2plY3RcXFxcUE9TXFxcXG1pbmlfcG9zXFxcXHZpdGUucmVuZGVyZXIuY29uZmlnLm1qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvQVNVUy9Eb2N1bWVudHMvR2l0SHViL25vb25tYXItcHJvamVjdC9QT1MvbWluaV9wb3Mvdml0ZS5yZW5kZXJlci5jb25maWcubWpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCB0cmFuc2Zvcm1XaXRoRXNidWlsZCB9IGZyb20gXCJ2aXRlXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJub2RlOnBhdGhcIjtcclxuaW1wb3J0IHsgY3JlYXRlUmVxdWlyZSB9IGZyb20gXCJub2RlOm1vZHVsZVwiO1xyXG5cclxuY29uc3QgZnJvbnRlbmRSZXF1aXJlID0gY3JlYXRlUmVxdWlyZShcclxuICBwYXRoLnJlc29sdmUoXCJzcmMvZnJvbnRlbmQvcGFja2FnZS5qc29uXCIpLFxyXG4pO1xyXG5jb25zdCB0YWlsd2luZGNzcyA9IGZyb250ZW5kUmVxdWlyZShcInRhaWx3aW5kY3NzXCIpO1xyXG5jb25zdCBhdXRvcHJlZml4ZXIgPSBmcm9udGVuZFJlcXVpcmUoXCJhdXRvcHJlZml4ZXJcIik7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW1xyXG4gICAge1xyXG4gICAgICBuYW1lOiBcImxvYWQtanMtZmlsZXMtYXMtanN4XCIsXHJcbiAgICAgIGVuZm9yY2U6IFwicHJlXCIsXHJcbiAgICAgIGFzeW5jIHRyYW5zZm9ybShjb2RlLCBpZCkge1xyXG4gICAgICAgIGlmICghaWQubWF0Y2goL3NyY1xcL2Zyb250ZW5kXFwvc3JjXFwvLipcXC4oanN8anN4KSQvKSkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIHJldHVybiB0cmFuc2Zvcm1XaXRoRXNidWlsZChjb2RlLCBpZCwge1xyXG4gICAgICAgICAgbG9hZGVyOiBcImpzeFwiLFxyXG4gICAgICAgICAganN4OiBcImF1dG9tYXRpY1wiLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICBdLFxyXG4gIGVzYnVpbGQ6IHtcclxuICAgIGxvYWRlcjogXCJqc3hcIixcclxuICAgIGluY2x1ZGU6IC9zcmNcXC9mcm9udGVuZFxcL3NyY1xcLy4qXFwuKGpzfGpzeCkkLyxcclxuICB9LFxyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgZXNidWlsZE9wdGlvbnM6IHtcclxuICAgICAgbG9hZGVyOiB7XHJcbiAgICAgICAgXCIuanNcIjogXCJqc3hcIixcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBjc3M6IHtcclxuICAgIHBvc3Rjc3M6IHtcclxuICAgICAgcGx1Z2luczogW1xyXG4gICAgICAgIHRhaWx3aW5kY3NzKHtcclxuICAgICAgICAgIGNvbmZpZzogcGF0aC5yZXNvbHZlKFwic3JjL2Zyb250ZW5kL3RhaWx3aW5kLmNvbmZpZy5qc1wiKSxcclxuICAgICAgICB9KSxcclxuICAgICAgICBhdXRvcHJlZml4ZXIoKSxcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdVksU0FBUyxjQUFjLDRCQUE0QjtBQUMxYixPQUFPLFVBQVU7QUFDakIsU0FBUyxxQkFBcUI7QUFFOUIsSUFBTSxrQkFBa0I7QUFBQSxFQUN0QixLQUFLLFFBQVEsMkJBQTJCO0FBQzFDO0FBQ0EsSUFBTSxjQUFjLGdCQUFnQixhQUFhO0FBQ2pELElBQU0sZUFBZSxnQkFBZ0IsY0FBYztBQUduRCxJQUFPLCtCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUDtBQUFBLE1BQ0UsTUFBTTtBQUFBLE1BQ04sU0FBUztBQUFBLE1BQ1QsTUFBTSxVQUFVLE1BQU0sSUFBSTtBQUN4QixZQUFJLENBQUMsR0FBRyxNQUFNLG1DQUFtQyxFQUFHLFFBQU87QUFFM0QsZUFBTyxxQkFBcUIsTUFBTSxJQUFJO0FBQUEsVUFDcEMsUUFBUTtBQUFBLFVBQ1IsS0FBSztBQUFBLFFBQ1AsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsUUFBUTtBQUFBLElBQ1IsU0FBUztBQUFBLEVBQ1g7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLGdCQUFnQjtBQUFBLE1BQ2QsUUFBUTtBQUFBLFFBQ04sT0FBTztBQUFBLE1BQ1Q7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsS0FBSztBQUFBLElBQ0gsU0FBUztBQUFBLE1BQ1AsU0FBUztBQUFBLFFBQ1AsWUFBWTtBQUFBLFVBQ1YsUUFBUSxLQUFLLFFBQVEsaUNBQWlDO0FBQUEsUUFDeEQsQ0FBQztBQUFBLFFBQ0QsYUFBYTtBQUFBLE1BQ2Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
