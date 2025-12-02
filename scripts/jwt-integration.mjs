import jwt from "jsonwebtoken";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default function jwtIntegration() {
  return {
    name: "jwt-generator",
    hooks: {
      "astro:config:setup": ({ command, updateConfig }) => {
        // Only run in dev mode
        if (command !== "dev") return;

        // Load JWT_SECRET from .env file
        let JWT_SECRET = process.env.JWT_SECRET;

        if (!JWT_SECRET) {
          const envPath = join(__dirname, "..", ".env");
          if (existsSync(envPath)) {
            const envContent = readFileSync(envPath, "utf-8");
            const secretMatch = envContent.match(/^JWT_SECRET=(.+)$/m);
            if (secretMatch) {
              JWT_SECRET = secretMatch[1].trim();
            }
          }
        }

        if (!JWT_SECRET) {
          console.error("❌ JWT_SECRET not found in environment variables. Please add JWT_SECRET to your .env file.");
          process.exit(1);
        }

        const payload = {
          iss: "supabase",
          sub: "00000000-0000-0000-0000-000000000001",
          role: "authenticated",
          aud: "authenticated",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const token = jwt.sign(payload, JWT_SECRET, {
          algorithm: "HS256",
          header: {
            alg: "HS256",
            typ: "JWT",
          },
        });

        // Set the token as an environment variable for the current process
        process.env.SUPABASE_KEY = token;

        console.log("✅ JWT token generated and set as SUPABASE_KEY");
      },
    },
  };
}
