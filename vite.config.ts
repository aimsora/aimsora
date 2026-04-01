import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [vue()],
    server: {
      port: 4173,
      proxy: {
        "/graphql": {
          target: env.VITE_GRAPHQL_PROXY_TARGET ?? "http://localhost:3000",
          changeOrigin: true
        }
      }
    }
  };
});
