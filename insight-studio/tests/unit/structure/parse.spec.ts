import { describe, expect, it } from 'vitest'
import {
  columnNameSuggestsStructure,
  isStructureCandidate,
  looksLikeMol,
  looksLikeSmiles,
} from '../../../src/modules/table/structure/parse'

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
    expect(looksLikeSmiles('c1ccccc1')).toBe(true)
    expect(looksLikeSmiles('ClC')).toBe(true)
    expect(looksLikeSmiles('C')).toBe(true)
  })

  it('rejects English words and identifiers', () => {
    expect(looksLikeSmiles('hello')).toBe(false)
    expect(looksLikeSmiles('hello world')).toBe(false)
    expect(looksLikeSmiles('Sample')).toBe(false)
    expect(looksLikeSmiles('aspirin')).toBe(false)
    expect(looksLikeSmiles('compound')).toBe(false)
    expect(looksLikeSmiles('hello1')).toBe(false)
    expect(looksLikeSmiles('42')).toBe(false)
    expect(looksLikeSmiles('InChI=1S/C2H6O/c1-2-3/h3H,2H2,1H3')).toBe(false)
  })
})

describe('isStructureCandidate', () => {
  it('true for smiles or mol', () => {
    expect(isStructureCandidate('c1ccccc1')).toBe(true)
  })
})

describe('columnNameSuggestsStructure', () => {
  it('matches common header names', () => {
    expect(columnNameSuggestsStructure('smiles')).toBe(true)
    expect(columnNameSuggestsStructure('Canonical_SMILES')).toBe(true)
    expect(columnNameSuggestsStructure('molecule')).toBe(true)
    expect(columnNameSuggestsStructure('name')).toBe(false)
  })
})
