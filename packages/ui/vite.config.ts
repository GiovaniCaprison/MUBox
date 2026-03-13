import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig, type ProxyOptions } from "vite";

const apiProxy: ProxyOptions = {
  target: "http://localhost:8080",
  changeOrigin: true,
  secure: false,
};

export default defineConfig({
  build: { emptyOutDir: true, outDir: "../../build/ui" },
  experimental: {
    enableNativePlugin: true,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/domain": resolve(__dirname, "./src/domain"),
      "@/state": resolve(__dirname, "./src/state"),
      "@/clients": resolve(__dirname, "./src/clients"),
      "@/renderers": resolve(__dirname, "./src/renderers"),
      "@/factories": resolve(__dirname, "./src/factories"),
      "@/providers": resolve(__dirname, "./src/providers"),
      "@/types": resolve(__dirname, "./src/types"),
      "@/constants": resolve(__dirname, "./src/constants"),
      "@/components": resolve(__dirname, "./src/components"),
      "@/layout": resolve(__dirname, "./src/layout"),
      "@/pages": resolve(__dirname, "./src/pages"),
      "@/hooks": resolve(__dirname, "./src/pages/tsflap/hooks"),
    },
  },
  server: {
    open: true,
    port: 3000,
    proxy: {
      "/api": apiProxy,
    },
  },
});
