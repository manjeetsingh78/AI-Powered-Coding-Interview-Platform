import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import monacoEditorPlugin from "vite-plugin-monaco-editor";
import path from 'path';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE_URL || env.VITE_API_URL || '';
  const devApiTarget = apiBase || 'http://localhost:8000';

  return {
    plugins: [
    react(),
    monacoEditorPlugin.default({
      // https://github.com/vdesjs/vite-plugin-monaco-editor/blob/main/README.md
    }),
  ],
    resolve: {
      alias: {},
    },
    server: {
      proxy: {
        "/api": {
          target: devApiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
