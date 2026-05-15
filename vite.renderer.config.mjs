import { defineConfig, transformWithEsbuild } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    {
      name: "load-js-files-as-jsx",
      async transform(code, id) {
        if (!/src\/frontend\/src\/.*\.js$/.test(id.replaceAll("\\", "/"))) {
          return null;
        }

        return transformWithEsbuild(code, id, {
          loader: "jsx",
          jsx: "automatic",
        });
      },
    },
  ],
});
