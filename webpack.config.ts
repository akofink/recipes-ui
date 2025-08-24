import { resolve } from "path";
import { Configuration } from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import TerserPlugin from "terser-webpack-plugin";

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
        test: /\.css$/i,
        use: [
          mode === "production" ? MiniCssExtractPlugin.loader : "style-loader",
          {
            loader: "css-loader",
            options: { sourceMap: mode !== "production" },
          },
        ],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Extract CSS in production, fallback to style-loader in dev
          mode === "production" ? MiniCssExtractPlugin.loader : "style-loader",
          {
            loader: "css-loader",
            options: { sourceMap: mode !== "production" },
          },
          {
            loader: "sass-loader",
            options: { sourceMap: mode !== "production" },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename:
      mode === "production"
        ? "[name].[contenthash:8].bundle.js"
        : "[name].bundle.js",
    chunkFilename:
      mode === "production"
        ? "[name].[contenthash:8].chunk.js"
        : "[name].chunk.js",
    path: resolve(__dirname, "dist"),
    publicPath: "/",
    clean: true,
  },
  optimization: {
    minimize: mode === "production",
    minimizer: [
      new TerserPlugin({
        terserOptions: { compress: { comparisons: false } },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
        },
      },
    },
    runtimeChunk: "single",
  },
  plugins: [
    ...(mode === "production"
      ? [
          new MiniCssExtractPlugin({
            filename: "[name].[contenthash:8].css",
            chunkFilename: "[name].[contenthash:8].chunk.css",
          }),
        ]
      : []),
    new HtmlWebpackPlugin({
      template: resolve(__dirname, "public/index.html"),
      filename: "index.html",
      inject: "body",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: resolve(__dirname, "public/CNAME"),
          to: resolve(__dirname, "dist/CNAME"),
        },
        {
          from: resolve(__dirname, "public/404.html"),
          to: resolve(__dirname, "dist/404.html"),
        },
        {
          from: resolve(__dirname, "public/favicon.svg"),
          to: resolve(__dirname, "dist/favicon.svg"),
        },
        {
          from: resolve(__dirname, "public/favicon.ico"),
          to: resolve(__dirname, "dist/favicon.ico"),
        },
        {
          from: resolve(__dirname, "public/empty.svg"),
          to: resolve(__dirname, "dist/empty.svg"),
        },
        {
          from: resolve(__dirname, "public/spinner.svg"),
          to: resolve(__dirname, "dist/spinner.svg"),
        },
      ],
    }),
  ],
  ...(mode === "development" ? devExports : {}),
};

export default config;
