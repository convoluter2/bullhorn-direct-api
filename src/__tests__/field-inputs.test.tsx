import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ToManyFieldInput } from '@/components/ToManyFieldInput'
import { ToOneFieldInput } from '@/components/ToOneFieldInput'
import type { EntityField } from '@/hooks/use-entity-metadata'

vi.mock('@/lib/field-value-cache', () => ({
  fieldValueCache: {
    getFieldValues: vi.fn(),
    getFieldValueById: vi.fn(),
    getSafeFieldsForEntity: vi.fn(() => ['id', 'name', 'title']),
    prefetchCommonEntities: vi.fn(),
    invalidateAll: vi.fn()
  }
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn()
  }
}))

vi.mock('@/lib/bullhorn-api', () => ({
  bullhornAPI: {
    getSession: vi.fn(() => ({ BhRestToken: 'test-token' }))
  }
}))

describe('ToManyFieldInput', () => {
  const mockField: EntityField = {
    name: 'categories',
    label: 'Categories',
    type: 'TO_MANY',
    associationType: 'TO_MANY',
    associatedEntity: { entity: 'Category' },
    dataType: 'Integer'
  }

  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the component with default values', () => {
    render(<ToManyFieldInput field={mockField} value="" onChange={mockOnChange} />)
    
    expect(screen.getByText(/Operation Type/i)).toBeInTheDocument()
  })

  it('handles null field gracefully', () => {
    render(<ToManyFieldInput field={null} value="" onChange={mockOnChange} />)
    
    expect(screen.getByText(/No field selected/i)).toBeInTheDocument()
  })
})

describe('ToOneFieldInput', () => {
  const mockField: EntityField = {
    name: 'jobOrder',
    label: 'Job Order',
    type: 'TO_ONE',
    associationType: 'TO_ONE',
    associatedEntity: { entity: 'JobOrder' },
    dataType: 'Integer'
  }

  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the component with search and input fields', () => {
    render(<ToOneFieldInput field={mockField} value="" onChange={mockOnChange} />)
    
    expect(screen.getByPlaceholderText(/Search JobOrder/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter JobOrder ID/)).toBeInTheDocument()
  })
})
