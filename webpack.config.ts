import { resolve } from "path";
import { Configuration } from "webpack";

const node_env = process.env.NODE_ENV?.toLowerCase() ?? "d";
const mode = node_env.startsWith("d") ? "development" : "production";

const devExports = {
  devtool: "eval-source-map",
  devServer: {
    static: "./dist",
    port: process.env.PORT || 3000,
    host: process.env.HOST || "0.0.0.0",
    allowedHosts: "all",
    historyApiFallback: true,
  },
};

const config: Configuration = {
  mode,
  entry: async () => {
    // generate static data at build in production mode
    if (mode === "production") {
      // Lazy require to avoid impacting dev server startup if not needed
      const { spawnSync } = await import("child_process");
      const res = spawnSync("node", ["scripts/generate-static-data.js"], {
        stdio: "inherit",
      });
      if (res.status !== 0) {
        throw new Error(`Failed to generate static data (exit ${res.status})`);
      }
    }
    return { index: resolve(__dirname, "./src/index.tsx") };
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          "style-loader",
          // Translates CSS into CommonJS
          "css-loader",
          // Compiles Sass to CSS
          "sass-loader",
        ],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "[name].bundle.js",
    path: resolve(__dirname, "dist"),
  },
  ...(mode === "development" ? devExports : {}),
};

export default config;
