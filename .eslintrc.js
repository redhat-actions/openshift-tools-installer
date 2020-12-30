// eslint-disable-next-line no-undef
module.exports = {
    env: {
        browser: false,
        es2021: true
    },
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 12,
        sourceType: "module"
    },
    plugins: [
        "@typescript-eslint"
    ],
    rules: {
        "@typescript-eslint/no-namespace": 0,
        "no-inner-declarations": 0,
        "semi": 1
    }
};
