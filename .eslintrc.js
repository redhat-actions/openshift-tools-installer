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
        "consistent-return": 1,
        "curly": 1,
        "default-case": 1,
        "default-case-last": 1,
        "eqeqeq": [ 1, "smart" ],
        "no-constructor-return": 1,
        "no-else-return": 1,
        "no-eval": 1,
        "no-fallthrough": 1,
        "no-floating-decimal": 1,
        "no-invalid-this": 1,
        "no-redeclare": 1,
        "no-self-compare": 1,
        "no-throw-literal": 1,
        "no-unused-expressions": 1,
        "no-void": 1,
        "semi": 1,
    "quotes": [ 1, "double", { allowTemplateLiterals: true } ],

        "array-bracket-spacing": [ 1, "always" ],
        "no-undef-init": 1,
        "no-use-before-define": [ 1, { functions: false, classes: false } ],
        "object-curly-spacing": [ 1, "always" ],

        "max-len": [ 1, 150 ],

        // disables
        "@typescript-eslint/no-namespace": 0,
        "no-inner-declarations": 0,
    }
};
