import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Environment variable checker integration
 * Validates required environment variables at startup
 */
export default function envCheckIntegration() {
  return {
    name: "env-checker",
    hooks: {
      "astro:config:setup": ({ command }) => {
        // Only run in dev mode
        if (command !== "dev") return;

        // Load .env file explicitly
        const envPath = join(__dirname, "..", ".env");
        config({ path: envPath });

        console.log("\n🔍 Checking environment variables...");

        // Check OPENROUTER_API_KEY
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        if (openRouterKey) {
          const maskedKey = openRouterKey.substring(0, 10) + "..." + openRouterKey.slice(-4);
          console.log(`✅ OPENROUTER_API_KEY found: ${maskedKey}`);
        } else {
          console.warn("⚠️  OPENROUTER_API_KEY not found in environment");
          console.warn("   Add OPENROUTER_API_KEY=your-key to .env file");
        }

        // Check DEVENV
        const devEnv = process.env.DEVENV;
        if (devEnv === "true") {
          console.log("✅ DEVENV=true (development mode)");
        } else {
          console.log("ℹ️  DEVENV not set (production mode)");
        }

        console.log("");
      },
    },
  };
}

