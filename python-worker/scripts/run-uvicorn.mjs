#!/usr/bin/env node
/**
 * Cross-platform uvicorn launcher (Windows/macOS/Linux).
 * Prefers project `.venv` (same idea as local start scripts), then PATH `python`/`python3`/`py`.
 * Installs requirements.txt when scientific packages are missing (rdkit 等) into the chosen interpreter.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
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

function venvPythonCandidates() {
  if (process.platform === 'win32') {
    return [path.join(root, '.venv', 'Scripts', 'python.exe')]
  }
  return [
    path.join(root, '.venv', 'bin', 'python'),
    path.join(root, '.venv', 'bin', 'python3'),
  ]
}

async function resolvePython() {
  for (const bin of venvPythonCandidates()) {
    if (!fs.existsSync(bin)) continue
    const ok = await tryPython(bin)
    if (ok) {
      console.log(`[python-worker] using project venv: ${bin}`)
      return ok
    }
  }
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
    '[python-worker] Python not found (no .venv and none on PATH).\n' +
      'Recommended:\n' +
      '  cd python-worker\n' +
      '  python -m venv .venv\n' +
      '  # Windows: .venv\\Scripts\\python.exe -m pip install -r requirements.txt\n' +
      '  # macOS/Linux: .venv/bin/python -m pip install -r requirements.txt\n' +
      '  npm start\n' +
      'Or install Python 3.11+ on PATH and re-run npm start.\n',
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
