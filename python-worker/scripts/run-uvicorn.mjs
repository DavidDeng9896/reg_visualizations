#!/usr/bin/env node
/**
 * Cross-platform uvicorn launcher (Windows/macOS/Linux).
 * Prefers `python`, falls back to `python3`.
 * Installs requirements.txt when scientific packages are missing (rdkit 等).
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const extra = process.argv.slice(2)

function spawnPy(bin, args, inherit = true) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: root,
      stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })
    let out = ''
    if (!inherit) {
      child.stdout?.on('data', (d) => {
        out += String(d)
      })
      child.stderr?.on('data', (d) => {
        out += String(d)
      })
    }
    child.on('error', reject)
    child.on('exit', (code) => resolve({ code: code ?? 1, out }))
  })
}

function pyArgs(bin, rest) {
  return bin === 'py' ? ['-3', ...rest] : rest
}

async function tryPython(bin) {
  try {
    const r = await spawnPy(bin, pyArgs(bin, ['-c', 'import sys; print(sys.executable)']), false)
    return r.code === 0 ? bin : null
  } catch {
    return null
  }
}

async function resolvePython() {
  for (const bin of ['python', 'python3', 'py']) {
    const ok = await tryPython(bin)
    if (ok) return ok
  }
  return null
}

async function ensureDeps(py) {
  const check = [
    '-c',
    'from app.packages import missing_packages; m=missing_packages(); print(",".join(m)); raise SystemExit(1 if m else 0)',
  ]
  const probed = await spawnPy(py, pyArgs(py, check), false)
  if (probed.code === 0) return
  const missing = probed.out.split('\n').map((l) => l.trim()).filter(Boolean).pop() || 'unknown'
  console.log(`[python-worker] missing packages (${missing}); installing requirements.txt…`)
  const inst = await spawnPy(py, pyArgs(py, ['-m', 'pip', 'install', '-r', 'requirements.txt']), true)
  if (inst.code !== 0) {
    console.error('[python-worker] pip install failed. Custom Code 将缺少 rdkit 等包。')
    process.exit(inst.code)
  }
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

await ensureDeps(py)

const args = pyArgs(py, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8091', ...extra])

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
