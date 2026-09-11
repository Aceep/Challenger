import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Shipped verbatim, not bundled: `public/sw.js` is a service worker with its
    // own globals (`self`, `clients`), which the app's rules know nothing about.
    "public/**",
  ]),
]);

export default eslintConfig;
