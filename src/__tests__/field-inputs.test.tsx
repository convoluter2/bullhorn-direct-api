import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ToManyFieldInput } from '@/components/ToManyFieldInput'
import { ToOneFieldInput } from '@/components/ToOneFieldInput'
import type { EntityField } from '@/hooks/use-entity-metadata'
import { fieldValueCache } from '@/lib/field-value-cache'

vi.mock('@/lib/field-value-cache', () => ({
  fieldValueCache: {
    getFieldValues: vi.fn(),
    getFieldValueById: vi.fn(),
    getSafeFieldsForEntity: vi.fn(() => ['id', 'name', 'title']),
    prefetchCommonEntities: vi.fn(),
    invalidateAll: vi.fn()
  }
}))

vi.mock('@/hooks/use-entity-metadata', () => ({
  useEntityMetadata: vi.fn(() => ({
    metadata: {
      fields: [
        { name: 'id', label: 'ID', type: 'SCALAR', dataType: 'Integer' },
        { name: 'name', label: 'Name', type: 'SCALAR', dataType: 'String' }
      ]
    },
    loading: false
  }))
}))

vi.mock('@/hooks/use-field-values', () => ({
  useFieldValues: vi.fn(() => ({
    values: [],
    isLoading: false,
    refresh: vi.fn()
  }))
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn()
  }
}))

describe('ToManyFieldInput', () => {
  const mockField: EntityField = {
    name: 'primarySkills',
    label: 'Primary Skills',
    type: 'TO_MANY',
    associationType: 'TO_MANY',
    associatedEntity: { entity: 'Skill' },
    dataType: 'Integer'
  }

  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the component with correct title', () => {
    render(<ToManyFieldInput field={mockField} value="" onChange={mockOnChange} />)
    expect(screen.getByText('To-Many Association Configuration')).toBeInTheDocument()
  })

  it('displays operation type selector with add/remove/replace options', async () => {
    render(<ToManyFieldInput field={mockField} value="" onChange={mockOnChange} />)
    
    const operationTrigger = screen.getByRole('combobox', { name: /operation type/i })
    expect(operationTrigger).toBeInTheDocument()
    
    fireEvent.click(operationTrigger)
    
    await waitFor(() => {
      expect(screen.getByText('➕ Add')).toBeInTheDocument()
      expect(screen.getByText('➖ Remove')).toBeInTheDocument()
      expect(screen.getByText('🔄 Replace')).toBeInTheDocument()
    })
  })

  it('parses and displays JSON value correctly', () => {
    const testValue = JSON.stringify({
      operation: 'add',
      ids: [100, 200, 300],
      subField: 'id'
    })

    render(<ToManyFieldInput field={mockField} value={testValue} onChange={mockOnChange} />)
    
    expect(screen.getByText(/ID: 100/)).toBeInTheDocument()
    expect(screen.getByText(/ID: 200/)).toBeInTheDocument()
    expect(screen.getByText(/ID: 300/)).toBeInTheDocument()
  })

  it('calls onChange with proper JSON format when adding IDs', async () => {
    render(<ToManyFieldInput field={mockField} value="" onChange={mockOnChange} />)
    
    const input = screen.getByPlaceholderText(/e.g., 12345, 67890/)
    const addButton = screen.getByRole('button', { name: /add/i })
    
    fireEvent.change(input, { target: { value: '100, 200, 300' } })
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled()
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      const parsed = JSON.parse(lastCall)
      expect(parsed.operation).toBe('add')
      expect(parsed.ids).toEqual([100, 200, 300])
      expect(parsed.subField).toBe('id')
    })
  })

  it('allows removing individual IDs', async () => {
    const testValue = JSON.stringify({
      operation: 'add',
      ids: [100, 200, 300],
      subField: 'id'
    })

    render(<ToManyFieldInput field={mockField} value={testValue} onChange={mockOnChange} />)
    
    const removeButtons = screen.getAllByRole('button', { name: '' }).filter(btn => 
      btn.querySelector('svg')
    )
    
    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0])
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
        const parsed = JSON.parse(lastCall)
        expect(parsed.ids.length).toBeLessThan(3)
      })
    }
  })

  it('updates operation type correctly', async () => {
    render(<ToManyFieldInput field={mockField} value="" onChange={mockOnChange} />)
    
    const operationTrigger = screen.getByRole('combobox', { name: /operation type/i })
    fireEvent.click(operationTrigger)
    
    await waitFor(() => {
      const removeOption = screen.getByText('➖ Remove')
      fireEvent.click(removeOption)
    })
    
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled()
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      const parsed = JSON.parse(lastCall)
      expect(parsed.operation).toBe('remove')
    })
  })

  it('displays operation summary based on selected operation', () => {
    const addValue = JSON.stringify({
      operation: 'add',
      ids: [100],
      subField: 'id'
    })

    const { rerender } = render(<ToManyFieldInput field={mockField} value={addValue} onChange={mockOnChange} />)
    expect(screen.getByText(/Add Operation/)).toBeInTheDocument()
    
    const removeValue = JSON.stringify({
      operation: 'remove',
      ids: [100],
      subField: 'id'
    })
    
    rerender(<ToManyFieldInput field={mockField} value={removeValue} onChange={mockOnChange} />)
    expect(screen.getByText(/Remove Operation/)).toBeInTheDocument()
    
    const replaceValue = JSON.stringify({
      operation: 'replace',
      ids: [100],
      subField: 'id'
    })
    
    rerender(<ToManyFieldInput field={mockField} value={replaceValue} onChange={mockOnChange} />)
    expect(screen.getByText(/Replace Operation/)).toBeInTheDocument()
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

  it('validates and displays lookup data for valid ID', async () => {
    const mockLookupData = {
      id: 919540,
      title: 'Senior Software Engineer'
    }

    vi.mocked(fieldValueCache.getFieldValueById).mockResolvedValue(mockLookupData)

    render(<ToOneFieldInput field={mockField} value="919540" onChange={mockOnChange} />)
    
    await waitFor(() => {
      expect(screen.getByText(/Senior Software Engineer/)).toBeInTheDocument()
      expect(screen.getByText(/ID: 919540/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows error for invalid ID', async () => {
    vi.mocked(fieldValueCache.getFieldValueById).mockResolvedValue(null)

    render(<ToOneFieldInput field={mockField} value="999999" onChange={mockOnChange} />)
    
    await waitFor(() => {
      expect(screen.getByText(/No JobOrder found/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('allows clearing the value', async () => {
    const mockLookupData = {
      id: 919540,
      title: 'Senior Software Engineer'
    }

    vi.mocked(fieldValueCache.getFieldValueById).mockResolvedValue(mockLookupData)

    render(<ToOneFieldInput field={mockField} value="919540" onChange={mockOnChange} />)
    
    await waitFor(() => {
      const clearButton = screen.getByRole('button', { name: '' })
      expect(clearButton).toBeInTheDocument()
      fireEvent.click(clearButton)
    })
    
    expect(mockOnChange).toHaveBeenCalledWith('')
  })

  it('performs search and displays results', async () => {
    const mockSearchResults = [
      { id: 100, name: 'Software Engineer', title: 'Software Engineer' },
      { id: 200, name: 'Senior Developer', title: 'Senior Developer' }
    ]

    vi.mocked(fieldValueCache.getFieldValues).mockResolvedValue(mockSearchResults)

    render(<ToOneFieldInput field={mockField} value="" onChange={mockOnChange} />)
    
    const searchInput = screen.getByPlaceholderText(/Search JobOrder/)
    fireEvent.change(searchInput, { target: { value: 'Software' } })
    
    await waitFor(() => {
      expect(fieldValueCache.getFieldValues).toHaveBeenCalledWith(
        'JobOrder',
        expect.any(Array),
        'Software'
      )
    }, { timeout: 3000 })
  })

  it('selects record from search results', async () => {
    const mockSearchResults = [
      { id: 100, name: 'Software Engineer', title: 'Software Engineer' }
    ]

    vi.mocked(fieldValueCache.getFieldValues).mockResolvedValue(mockSearchResults)

    render(<ToOneFieldInput field={mockField} value="" onChange={mockOnChange} />)
    
    const searchInput = screen.getByPlaceholderText(/Search JobOrder/)
    fireEvent.change(searchInput, { target: { value: 'Software' } })
    
    await waitFor(() => {
      const selectButton = screen.getByRole('button', { name: /select/i })
      fireEvent.click(selectButton)
    }, { timeout: 3000 })
    
    expect(mockOnChange).toHaveBeenCalledWith('100')
  })
})

describe('ToMany Field Input - Add Operation', () => {
  const mockField: EntityField = {
    name: 'categories',
    label: 'Categories',
    type: 'TO_MANY',
    associationType: 'TO_MANY',
    associatedEntity: { entity: 'Category' },
    dataType: 'Integer'
  }

  it('correctly formats add operation for API', () => {
    const mockOnChange = vi.fn()
    render(<ToManyFieldInput field={mockField} value="" onChange={mockOnChange} />)
    
    const input = screen.getByPlaceholderText(/e.g., 12345, 67890/)
    fireEvent.change(input, { target: { value: '1, 2, 3' } })
    
    const addButton = screen.getByRole('button', { name: /add/i })
    fireEvent.click(addButton)
    
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
    const parsed = JSON.parse(lastCall)
    
    expect(parsed).toEqual({
      operation: 'add',
      ids: [1, 2, 3],
      subField: 'id'
    })
  })
})

describe('ToMany Field Input - Remove Operation', () => {
  const mockField: EntityField = {
    name: 'categories',
    label: 'Categories',
    type: 'TO_MANY',
    associationType: 'TO_MANY',
    associatedEntity: { entity: 'Category' },
    dataType: 'Integer'
  }

  it('correctly formats remove operation for API', async () => {
    const mockOnChange = vi.fn()
    render(<ToManyFieldInput field={mockField} value="" onChange={mockOnChange} />)
    
    const operationTrigger = screen.getByRole('combobox', { name: /operation type/i })
    fireEvent.click(operationTrigger)
    
    await waitFor(() => {
      const removeOption = screen.getByText('➖ Remove')
      fireEvent.click(removeOption)
    })
    
    const input = screen.getByPlaceholderText(/e.g., 12345, 67890/)
    fireEvent.change(input, { target: { value: '5, 10' } })
    
    const addButton = screen.getByRole('button', { name: /add/i })
    fireEvent.click(addButton)
    
    await waitFor(() => {
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      const parsed = JSON.parse(lastCall)
      
      expect(parsed).toEqual({
        operation: 'remove',
        ids: [5, 10],
        subField: 'id'
      })
    })
  })
})

describe('ToMany Field Input - Replace Operation', () => {
  const mockField: EntityField = {
    name: 'categories',
    label: 'Categories',
    type: 'TO_MANY',
    associationType: 'TO_MANY',
    associatedEntity: { entity: 'Category' },
    dataType: 'Integer'
  }

  it('correctly formats replace operation for API', async () => {
    const mockOnChange = vi.fn()
    render(<ToManyFieldInput field={mockField} value="" onChange={mockOnChange} />)
    
    const operationTrigger = screen.getByRole('combobox', { name: /operation type/i })
    fireEvent.click(operationTrigger)
    
    await waitFor(() => {
      const replaceOption = screen.getByText('🔄 Replace')
      fireEvent.click(replaceOption)
    })
    
    const input = screen.getByPlaceholderText(/e.g., 12345, 67890/)
    fireEvent.change(input, { target: { value: '99, 100' } })
    
    const addButton = screen.getByRole('button', { name: /add/i })
    fireEvent.click(addButton)
    
    await waitFor(() => {
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      const parsed = JSON.parse(lastCall)
      
      expect(parsed).toEqual({
        operation: 'replace',
        ids: [99, 100],
        subField: 'id'
      })
    })
  })
})
