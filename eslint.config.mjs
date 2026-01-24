import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import tsparser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["main.js", "**/*.mjs", "node_modules/**"]
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json"
      }
    },
    plugins: {
      obsidianmd: obsidianmd
    },
    rules: {
      ...obsidianmd.configs.recommended
    }
  }
];
