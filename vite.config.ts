import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  // Prevent Vite from obscuring rust errors
  clearScreen: false,

  // Tauri expects a fixed port, fail if not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // Tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  build: {
    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split vendor libraries into a separate chunk for better caching
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "tauri-vendor": ["@tauri-apps/api"],
          "ui-vendor": ["lucide-react", "react-hot-toast"],
        },
      },
    },
    // Enable minification optimizations
    minify: "esbuild",
    target: "esnext",
  },
}));
