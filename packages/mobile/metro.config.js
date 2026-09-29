// Metro config for the Expo mobile package inside an npm workspaces
// monorepo.
//
// Two problems this file solves:
//
// 1. Duplicate React. Mobile uses React 19; admin uses React 18 (hoisted
//    to root). Without intervention Metro pulls in BOTH, causing
//    "Invalid hook call" / "Cannot read property 'useContext' of null"
//    errors. Fix: a custom resolveRequest that pins react / react-native
//    / react-dom to the copies in packages/mobile/node_modules.
//
// 2. Workspace package resolution. @stash/shared is symlinked into the
//    workspace ROOT node_modules (npm workspaces convention), not into
//    packages/mobile/node_modules. So Metro needs to know about both
//    locations. Fix: include the workspace root in watchFolders +
//    nodeModulesPaths.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so edits to @stash/shared trigger reloads.
config.watchFolders = [workspaceRoot];

// Allow resolution from both mobile's node_modules (preferred) and the
// workspace root (for hoisted deps + the @stash/* symlinks).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Keep hierarchical lookup ON (the Expo default). npm nests some packages
// under their parent (e.g. expo/node_modules/expo-modules-core in SDK 57),
// and Metro can only find those by walking up the tree. Duplicate React is
// prevented by the resolveRequest pin below, not by disabling this.
config.resolver.disableHierarchicalLookup = false;

// Force React, react-native, and friends to always resolve to the mobile
// package's own copy. Without this Metro happily loads two Reacts (one
// from root, one from mobile) and hooks blow up at runtime.
const PINNED_TO_MOBILE = new Set([
  'react',
  'react-dom',
  'react-native',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'scheduler',
]);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (PINNED_TO_MOBILE.has(moduleName)) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectRoot, 'index.js') },
      moduleName,
      platform,
    );
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
