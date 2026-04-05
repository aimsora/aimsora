import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2025-01-15",
  ssr: false,
  devtools: { enabled: false },
  modules: ["@nuxtjs/tailwindcss"],
  imports: {
    dirs: ["utils"]
  },
  css: ["@fontsource-variable/geist", "~/assets/css/tailwind.css", "~/assets/css/theme.css"],
  components: [
    {
      path: "~/components",
      pathPrefix: false
    }
  ],
  runtimeConfig: {
    public: {
      graphqlEndpoint: process.env.NUXT_PUBLIC_GRAPHQL_ENDPOINT ?? "/graphql"
    }
  },
  app: {
    head: {
      titleTemplate: "%s · NPPWEB",
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg?v=2" }
      ],
      htmlAttrs: {
        lang: "ru"
      },
      bodyAttrs: {
        class: "min-h-screen bg-background font-sans text-foreground antialiased"
      }
    }
  },
  vite: {
    server: {
      proxy: {
        "/graphql": {
          target: process.env.NUXT_GRAPHQL_PROXY_TARGET ?? "http://localhost:3000",
          changeOrigin: true
        }
      }
    }
  },
  tailwindcss: {
    configPath: "tailwind.config.ts"
  }
});
