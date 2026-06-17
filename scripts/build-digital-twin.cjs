const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

try {
  execSync('npm --workspace src/digital-twin run build-lib', {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });
} catch (error) {
  process.exit(error.status ?? 1);
}
