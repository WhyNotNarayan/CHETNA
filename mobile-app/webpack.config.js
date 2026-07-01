// webpack.config.js
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // -------------------------------------------------
  //  🛠️  WASM HANDLING FOR expo‑sqlite (web)
  // -------------------------------------------------
  // Treat *.wasm as native WebAssembly modules.
  config.module.rules.push({
    test: /\.wasm$/,
    type: 'webassembly/async',
  });

  // Resolve the .wasm extension.
  config.resolve.extensions.push('.wasm');

  // Enable the async‑Wasm experiment (required by the rule above)
  // and top‑level‑await (some wasm loaders need it).
  config.experiments = {
    asyncWebAssembly: true,
    topLevelAwait: true,
  };

  return config;
};
