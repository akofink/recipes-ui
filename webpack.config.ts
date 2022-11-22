import { resolve } from 'path';
import { Configuration } from 'webpack';

const node_env = process.env.NODE_ENV?.toLowerCase() ?? 'd';
const mode = node_env.startsWith('d') ? 'development' : 'production';

const devExports = {
  devtool: 'eval-source-map',
  devServer: {
    static: './dist',
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    allowedHosts: 'all',
    historyApiFallback: true,
  },
};

const config: Configuration = {
  mode,
  entry: {
    index: resolve(__dirname, './src/index.tsx'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
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
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].bundle.js',
    path: resolve(__dirname, 'dist'),
  },
  ...(mode === 'development' ? devExports : {}),
};

export default config;
