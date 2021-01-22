module.exports = {
    extends: [
        "@redhat-actions/eslint-config"
    ],
    ignorePatterns: [
        "webpack.config.js"
    ],
    rules: {
        "@typescript-eslint/no-base-to-string": [ 2, { ignoredTypeNames: [ "SemVer", "Range" ] } ]
    }
};
