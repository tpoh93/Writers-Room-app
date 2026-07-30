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

import { createPrompt, deletePrompt, listPrompts, updatePrompt } from '@renderer/api/setting'

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
