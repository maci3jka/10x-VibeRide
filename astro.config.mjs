// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import jwtIntegration from "./scripts/jwt-integration.mjs";
import envCheckIntegration from "./scripts/env-check.mjs";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [envCheckIntegration(), jwtIntegration(), react(), sitemap()],
  // server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    server: {
      host: true, // Allow external connections (ngrok, etc.)
      allowedHosts: ["peppercorny-strangledly-lina.ngrok-free.dev"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "sonner"],
    },
    ssr: {
      noExternal: ["sonner"],
    },
  },
  adapter: node({
    mode: "standalone",
  }),
});
