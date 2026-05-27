import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import monacoEditorPlugin from "vite-plugin-monaco-editor";
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin.default({
      // https://github.com/vdesjs/vite-plugin-monaco-editor/blob/main/README.md
    }),
  ],
  // No mocks: use real packages in production builds. Keep alias map empty for now.
  resolve: {
    alias: {},
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
