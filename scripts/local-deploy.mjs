import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

function run(cmd, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

async function main() {
  const hasNodeModules = existsSync(path.join(root, 'node_modules'))
  if (!hasNodeModules) {
    await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install'], { cwd: root })
  }

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  await run(npm, ['run', 'build'], { cwd: root })

  const host = process.env.HOST ?? 'localhost'
  const port = process.env.PORT ?? '4173'
  // Serve built `dist` locally (production preview)
  await run(npm, ['run', 'preview', '--', '--host', host, '--port', port], { cwd: root })
}

main().catch((err) => {
  console.error(err?.message || err)
  process.exit(1)
})

