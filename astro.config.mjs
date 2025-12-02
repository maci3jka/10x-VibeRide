// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import jwtIntegration from "./scripts/jwt-integration.mjs";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [jwtIntegration(), react(), sitemap()],
  // server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: node({
    mode: "standalone",
  }),
});
