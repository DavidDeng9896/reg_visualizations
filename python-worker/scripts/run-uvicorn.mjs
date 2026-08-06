#!/usr/bin/env node
/**
 * Cross-platform uvicorn launcher (Windows/macOS/Linux).
 * Prefers `python`, falls back to `python3`.
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extra = process.argv.slice(2)

function tryPython(bin) {
  return new Promise((resolve) => {
    const child = spawn(bin, ['-c', 'import sys; print(sys.executable)'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: process.platform === 'win32',
    })
    let out = ''
    child.stdout?.on('data', (d) => {
      out += String(d)
    })
    child.on('error', () => resolve(null))
    child.on('close', (code) => resolve(code === 0 && out.trim() ? bin : null))
  })
}

async function resolvePython() {
  for (const bin of ['python', 'python3', 'py']) {
    const ok = await tryPython(bin)
    if (ok) return ok === 'py' ? 'py' : ok
  }
  return null
}

const py = await resolvePython()
if (!py) {
  console.error(
    '[python-worker] Python not found on PATH.\n' +
      'Install Python 3.11+, then:\n' +
      '  cd python-worker\n' +
      '  python -m pip install -r requirements.txt\n' +
      '  npm start\n',
  )
  process.exit(1)
}

const args =
  py === 'py'
    ? ['-3', '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8091', ...extra]
    : ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8091', ...extra]

console.log(`[python-worker] ${py} ${args.join(' ')}`)
console.log('[python-worker] health → http://127.0.0.1:8091/health')

const child = spawn(py, args, {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, PYTHONUNBUFFERED: '1' },
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
