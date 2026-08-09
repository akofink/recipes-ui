const babel = require("@babel/core");

module.exports = {
  process(sourceText, filename) {
    const result = babel.transformSync(sourceText, {
      filename,
      envName: "test",
      presets: [
        [require.resolve("@babel/preset-env"), { modules: "commonjs" }],
        [require.resolve("@babel/preset-react"), { runtime: "automatic" }],
        require.resolve("@babel/preset-typescript"),
        require.resolve("babel-preset-jest"),
      ],
    });

    return { code: result.code, map: result.map };
  },
};
