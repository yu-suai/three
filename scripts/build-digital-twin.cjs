const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return

  fs.mkdirSync(dest, { recursive: true })

  for (const item of fs.readdirSync(src)) {
    const from = path.join(src, item)
    const to = path.join(dest, item)
    const stat = fs.statSync(from)

    if (stat.isDirectory()) {
      copyDir(from, to)
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

try {
  execSync('npm --workspace src/digital-twin run build-lib', {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  })

  copyDir(
    path.join(rootDir, 'src/digital-twin/asset'),
    path.join(rootDir, 'dist/asset')
  )

  console.log('copy asset to dist/asset')
} catch (error) {
  process.exit(error.status ?? 1)
}