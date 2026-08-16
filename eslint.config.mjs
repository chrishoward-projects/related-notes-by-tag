import obsidianmd from "eslint-plugin-obsidianmd";

/**
 * The obsidianmd recommended config is self-contained as of v0.4.0: it bundles
 * typescript-eslint's type-checked rules, the import/sdl/depend/no-unsanitized
 * plugins, and the Obsidian globals. Adding those separately would only risk
 * drifting from what the community scanner actually runs.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  {
    ignores: ["main.js", "**/*.mjs", "node_modules/**"]
  },
  ...obsidianmd.configs.recommended,
  {
    // Type-checked rules need a program; the bundled config supplies the parser
    // but leaves the project wiring to us.
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
];
