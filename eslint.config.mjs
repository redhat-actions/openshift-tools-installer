import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["dist/", "out/", "node_modules/", "webpack.config.js", "eslint.config.mjs"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-base-to-string": ["error", { ignoredTypeNames: ["SemVer", "Range"] }],
            "function-paren-newline": ["error", "consistent"],
        },
    },
);
