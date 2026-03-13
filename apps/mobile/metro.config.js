const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 모노레포 루트 폴더도 감시 대상에 추가
config.watchFolders = [monorepoRoot];

// pnpm 모노레포: 루트 node_modules + .pnpm 심볼릭 링크 해결
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// pnpm 심볼릭 링크를 Metro가 따라갈 수 있도록 설정
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
