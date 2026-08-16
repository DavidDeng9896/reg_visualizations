import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseOpenAiModels, pickRecommendedModel, probeOpenAiModels } from './aiModels.ts'

describe('parseOpenAiModels', () => {
  it('reads OpenAI { data: [{ id }] } lists', () => {
    assert.deepEqual(
      parseOpenAiModels({
        data: [{ id: 'qwen3.6-flash' }, { id: 'qwen3.7-plus' }, { id: 'qwen3.6-flash' }],
      }),
      ['qwen3.6-flash', 'qwen3.7-plus'],
    )
  })
})

describe('pickRecommendedModel', () => {
  it('keeps current id when present, else prefers flash', () => {
    const ids = ['qwen3.7-plus', 'qwen3.6-flash', 'qwen3.7-max']
    assert.equal(pickRecommendedModel(ids, 'qwen3.7-plus'), 'qwen3.7-plus')
    assert.equal(pickRecommendedModel(ids, 'qwen3.7-flash'), 'qwen3.6-flash')
  })
})

describe('probeOpenAiModels', () => {
  it('calls /models with bearer token', async () => {
    const calls: string[] = []
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(input))
      const headers = init?.headers as { Authorization?: string }
      assert.equal(headers.Authorization, 'Bearer sk-test')
      return new Response(JSON.stringify({ data: [{ id: 'qwen3.6-flash' }] }), { status: 200 })
    }) as typeof fetch
    const out = await probeOpenAiModels('https://example.com/v1/', 'sk-test', fetchImpl)
    assert.equal(calls[0], 'https://example.com/v1/models')
    assert.deepEqual(out.models, ['qwen3.6-flash'])
    assert.equal(out.error, undefined)
  })
})
