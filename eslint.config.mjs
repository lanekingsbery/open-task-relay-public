import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import relayRules from "./eslint-rules.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    plugins: { otr: relayRules },
    rules: {
      // Replace the matcher with the same rule filtered only for REST APIs.
      // The paired rule still rejects native anchors for application pages.
      "@next/next/no-html-link-for-pages": "off",
      "otr/no-html-link-for-pages": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["vendor/braces/**/*.js"],
    rules: {
      // The reviewed Braces fork is a CommonJS package (see its package.json).
      // Converting require() would break its loader; keep every other rule.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["components/home-badges.tsx", "components/source-check-badge.tsx"],
    rules: {
      // Provider SVG badges are fetched directly to retain live status, the
      // CSP's provider paths, no-referrer policy and the workflow error fallback.
      // Proxying these through next/image would change that request boundary.
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
