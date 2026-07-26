import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../request', () => ({
  default: {
    get: mocks.get,
    post: mocks.post,
    put: mocks.put,
    delete: mocks.delete,
  },
}))

import { getFreeProject, getProjects } from '../projects'

describe('projects API paths', () => {
  beforeEach(() => {
    mocks.get.mockReset()
  })

  it('uses the canonical trailing slash for the project list', async () => {
    mocks.get.mockResolvedValue([])

    await getProjects()

    expect(mocks.get).toHaveBeenCalledWith('/projects/')
  })

  it('uses the canonical trailing slash in the free-project fallback', async () => {
    mocks.get
      .mockRejectedValueOnce(new Error('free route unavailable'))
      .mockResolvedValueOnce([{ id: 1, name: '__free__', description: '' }])

    await getFreeProject()

    expect(mocks.get).toHaveBeenNthCalledWith(2, '/projects/')
  })
})
