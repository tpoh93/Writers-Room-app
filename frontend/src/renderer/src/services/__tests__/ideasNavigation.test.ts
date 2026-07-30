import { describe, expect, it, vi } from 'vitest'

import { returnFromIdeas } from '@renderer/services/ideasNavigation'

describe('returnFromIdeas', () => {
  it('closes the separate ideas surface without changing the original project state', () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => undefined)

    returnFromIdeas()

    expect(close).toHaveBeenCalledOnce()
    close.mockRestore()
  })
})
