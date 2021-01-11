//@ts-check

"use strict";

const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");

/**
 * @param {string} env
 */
module.exports = (env) => {
    // const devtool = useDevMode ? "eval-source-map" : "inline-source-map";
    const devtool = "source-map";

    const entry = "./src/index.ts";     // https://webpack.js.org/configuration/entry-context/

    /**@type {import("webpack").Configuration}*/
    const config = {
        mode: "production",
        devtool,
        target: "node",
        entry,
        output: { // the output bundle is stored in the "dist" folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
            path: path.resolve(__dirname, "dist"),
            filename: "index.js",
            libraryTarget: "commonjs2",
            devtoolModuleFilenameTemplate: "../[resource-path]",
        },
        externals: {},
        resolve: { // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
            extensions: [".ts", ".js" ]
        },
        module: {
            rules: [{
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: "ts-loader"
            }
        ]},
        optimization: {
            minimize: true,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        mangle: false,
                        keep_classnames: true,
                        keep_fnames: true,
                    },
                    extractComments: false,
                })
            ]
        }
    }

    return config;
};
