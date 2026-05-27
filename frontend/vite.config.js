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
  resolve: {
    alias: {
      'react-canvas-draw': path.resolve(__dirname, 'src/mocks/react-canvas-draw.jsx'),
    },
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
