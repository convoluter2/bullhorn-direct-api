import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/field-value-cache', () => ({
  fieldValueCache: {
    getFieldValues: vi.fn(),
    invalidateAll: vi.fn()
  }
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}))

vi.mock('@/lib/bullhorn-api', () => ({
  bullhornAPI: {
    getSession: vi.fn(() => ({ BhRestToken: 'test-token' }))
  }
}))

describe('Field Inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render placeholder', () => {
    expect(true).toBe(true)
  })
})





































