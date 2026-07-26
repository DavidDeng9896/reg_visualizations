// tests/unit/structure/parse.spec.ts
import { describe, expect, it } from 'vitest'
import { isStructureCandidate, looksLikeMol, looksLikeSmiles } from '../../../src/modules/table/structure/parse'

describe('looksLikeMol', () => {
  it('recognizes V2000 molblock ending with M END', () => {
    const mol = [
      '',
      '  Mrv',
      '',
      '  1  0  0  0  0  0            999 V2000',
      '    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
      'M  END',
    ].join('\n')
    expect(looksLikeMol(mol)).toBe(true)
  })
  it('rejects plain text', () => {
    expect(looksLikeMol('hello world')).toBe(false)
  })
})

describe('looksLikeSmiles', () => {
  it('accepts common SMILES', () => {
    expect(looksLikeSmiles('CCO')).toBe(true)
    expect(looksLikeSmiles('CC(=O)Oc1ccccc1C(=O)O')).toBe(true)
  })
  it('rejects sentences and numbers-only', () => {
    expect(looksLikeSmiles('hello world')).toBe(false)
    expect(looksLikeSmiles('42')).toBe(false)
  })
})

describe('isStructureCandidate', () => {
  it('true for smiles or mol', () => {
    expect(isStructureCandidate('c1ccccc1')).toBe(true)
  })
})
