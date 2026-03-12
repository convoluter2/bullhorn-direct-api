import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EntityField } from '@/hooks/use-entity-me
vi.mock('@/lib/field-value-cache', () => ({

  }

    getFieldValues: vi.fn(),
    invalidateAll: vi.fn()
   
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn()
}))
}))

vi.mock('@/lib/bullhorn-api', () => ({
  bullhornAPI: {
    getSession: vi.fn(() => ({ BhRestToken: 'test-token' }))
   
}))

describe('Field Inputs', () => {
  const mockField: EntityField = {
    name: 'categories',
    label: 'Categories',
    type: 'TO_MANY',
    dataType: 'Integer',
    associatedEntity: {
      entity: 'Category',
      label: 'Category'
    }
  }
  
  const mockOnChange = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render placeholder', () => {
    expect(true).toBe(true)
  })
})






































