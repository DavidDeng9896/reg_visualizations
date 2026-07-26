import type { RDKitModule } from '@rdkit/rdkit'
import wasmUrl from '@rdkit/rdkit/dist/RDKit_minimal.wasm?url'
// CJS default export; package types omit callable default signature
import rdkitPkg from '@rdkit/rdkit'

type RDKitLoader = (options?: { locateFile?: (file: string) => string }) => Promise<RDKitModule>
const initRDKitModule = rdkitPkg as unknown as RDKitLoader

let rdkitPromise: Promise<RDKitModule> | undefined

export function ensureRdkit(): Promise<RDKitModule> {
  rdkitPromise ??= initRDKitModule({
    locateFile: (file: string) => {
      if (file.endsWith('.wasm')) return wasmUrl
      return file
    },
  })
  return rdkitPromise
}
