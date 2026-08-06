#!/usr/bin/env node
/** Install python-worker requirements with python/python3/py. */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${bin} exited ${code}`))))
  })
}

async function main() {
  const candidates = [
    ['python', ['-m', 'pip', 'install', '-r', 'requirements.txt']],
    ['python3', ['-m', 'pip', 'install', '-r', 'requirements.txt']],
    ['py', ['-3', '-m', 'pip', 'install', '-r', 'requirements.txt']],
  ]
  let lastErr
  for (const [bin, args] of candidates) {
    try {
      await run(bin, args)
      console.log(`[python-worker] deps installed via ${bin}`)
      return
    } catch (e) {
      lastErr = e
    }
  }
  console.error('[python-worker] failed to install deps', lastErr)
  process.exit(1)
}

await main()
