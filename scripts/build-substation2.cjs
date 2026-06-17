const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

const result = spawnSync(
  'npm',
  ['--workspace', 'src/substation2', 'run', 'build-lib'],
  {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
