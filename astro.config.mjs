// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import jwtIntegration from "./scripts/jwt-integration.mjs";
import envCheckIntegration from "./scripts/env-check.mjs";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [envCheckIntegration(), jwtIntegration(), react(), sitemap()],
  // server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
    define: {
      // Feature flag environment variables
      "import.meta.env.ENV_NAME": JSON.stringify(
        process.env.ENV_NAME || "local"
      ),
      "import.meta.env.FEATURE_FLAG_AUTH": JSON.stringify(
        process.env.FEATURE_FLAG_AUTH
      ),
      "import.meta.env.FEATURE_FLAG_COLLECTIONS": JSON.stringify(
        process.env.FEATURE_FLAG_COLLECTIONS
      ),
    },
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
  adapter: cloudflare(),
});