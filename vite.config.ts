import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ["src"],
      exclude: ["src/demo/**", "src/**/*.test.ts", "src/**/*.test.tsx", "src/**/__tests__/**"]
    })
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "ReactCronField",
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
      formats: ["es", "cjs"]
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM"
        },
        assetFileNames: (assetInfo) =>
          assetInfo.name === "style.css" ? "styles.css" : "assets/[name]-[hash][extname]"
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    css: true
  }
});
