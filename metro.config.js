const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite runs on web through wa-sqlite (WebAssembly), so Metro must treat
// .wasm as an asset. Native builds are unaffected.
//
// wa-sqlite's worker also needs SharedArrayBuffer, which browsers only expose
// on a cross-origin-isolated page (COOP + COEP). Expo's dev server ignores
// Metro's `server.enhanceMiddleware`, so those headers come from
// `scripts/web-coi-proxy.js` instead — browse via http://localhost:8090.
config.resolver.assetExts.push('wasm');

module.exports = config;
