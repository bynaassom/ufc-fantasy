import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}"],
    ignores: ["src/app/api/**/*", "src/app/auth/callback/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/ssr",
              message:
                "Use o client de autenticação ou a camada de serviços do servidor.",
            },
            {
              name: "@supabase/supabase-js",
              message:
                "Use o client de autenticação ou a camada de serviços do servidor.",
            },
            {
              name: "@/lib/supabase/server",
              message: "Use a camada de serviços do servidor.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "storybook-static/**",
    "test-results/**",
  ]),
]);
