class IsolatedTestStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(String(key), String(value))
  }
}

// Node 24's process-level localStorage is optional and can be shared by
// workers. Each jsdom test environment receives its own in-memory Storage,
// matching browser isolation and keeping parallel Vitest files independent.
const storage = new IsolatedTestStorage()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: storage,
})
Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: storage,
})
