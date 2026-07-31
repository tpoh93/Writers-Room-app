import { describe, expect, it, vi } from 'vitest'

const { get, post, put, remove } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@renderer/api/request', () => ({
  default: { get, post, put, delete: remove },
}))

import {
  createKnowledge,
  createPrompt,
  deleteKnowledge,
  deletePrompt,
  listKnowledge,
  listPrompts,
  updateKnowledge,
  updatePrompt,
} from '@renderer/api/setting'

describe('prompt API paths', () => {
  it('uses the canonical trailing-slash collection path and keeps item paths unchanged', async () => {
    await listPrompts()
    await createPrompt({ name: 'Syntetyczny prompt' })
    await updatePrompt(7, { description: 'Syntetyczny opis' })
    await deletePrompt(7)

    expect(get).toHaveBeenCalledWith('/prompts/')
    expect(post).toHaveBeenCalledWith('/prompts/', { name: 'Syntetyczny prompt' })
    expect(put).toHaveBeenCalledWith('/prompts/7', { description: 'Syntetyczny opis' })
    expect(remove).toHaveBeenCalledWith('/prompts/7')
  })
})

describe('knowledge API paths', () => {
  it('uses the canonical trailing-slash collection path without relying on a redirect', async () => {
    await listKnowledge()
    await createKnowledge({ name: 'Syntetyczna baza', content: 'Dane syntetyczne' })
    await updateKnowledge(7, { description: 'Syntetyczny opis' })
    await deleteKnowledge(7)

    expect(get).toHaveBeenCalledWith('/knowledge/')
    expect(post).toHaveBeenCalledWith('/knowledge/', { name: 'Syntetyczna baza', content: 'Dane syntetyczne' })
    expect(put).toHaveBeenCalledWith('/knowledge/7', { description: 'Syntetyczny opis' })
    expect(remove).toHaveBeenCalledWith('/knowledge/7')
  })
})
