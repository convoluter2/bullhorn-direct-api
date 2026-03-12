import { describe, it, expect, vi, beforeEach } from 'vitest'


vi.mock('@/lib/field-value-cache', () => ({
  fieldValueCache: {
    getFieldValues: vi.fn(),
    invalidateAll: vi.fn()
  }
}))

vi.mock('sonner', () => ({
  }
    error: vi.fn(),
vi.mock('@/lib/bullh
  }
}))

vi.mock('@/lib/bullhorn-api', () => ({
  bullhornAPI: {
    getSession: vi.fn(() => ({ BhRestToken: 'test-token' }))
  }
})) name: 'categories',

describe('Field Inputs', () => {
  const mockField: EntityField = {
    name: 'categories',
    label: 'Categories',,
    type: 'TO_MANY',
    dataType: 'Integer',
    associatedEntity: {
      entity: 'Category',
      label: 'Category'fn()
    }
  }eforeEach(() => {
    vi.clearAllMocks()
  const mockOnChange = vi.fn()

  beforeEach(() => {
    expect(true).toBe(true)
  })

  it('should render placeholder', () => {





































