import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

afterEach(() => {
  cleanup()
  kvStore.clear()
})

global.URL.createObjectURL = vi.fn(() => 'blob:test-url')
global.URL.revokeObjectURL = vi.fn()

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

const kvStore = new Map<string, any>()

const mockSpark = {
  llmPrompt: (strings: TemplateStringsArray, ...values: any[]) => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '')
  },
  llm: vi.fn(async (prompt: string) => JSON.stringify({ result: 'mock response' })),
  user: vi.fn(async () => ({
    avatarUrl: 'https://example.com/avatar.jpg',
    email: 'test@example.com',
    id: 'test-user-id',
    isOwner: true,
    login: 'testuser'
  })),
  kv: {
    keys: vi.fn(async () => [...kvStore.keys()]),
    get: vi.fn(async (key: string) => kvStore.get(key) ?? null),
    set: vi.fn(async (key: string, value: any) => { kvStore.set(key, value) }),
    delete: vi.fn(async (key: string) => { kvStore.delete(key) })
  }
}

Object.defineProperty(window, 'spark', {
  writable: true,
  value: mockSpark
})
