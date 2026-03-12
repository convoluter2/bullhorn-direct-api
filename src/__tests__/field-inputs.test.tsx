import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import type { EntityField } from '@/hooks/use-entity-metadata'

  fieldValueCache: {
    getFieldValueById: vi.fn(),

  }
  fieldValueCache: {
    getFieldValues: vi.fn(),
    getFieldValueById: vi.fn(),
    getSafeFieldsForEntity: vi.fn(() => ['id', 'name', 'title']),
    prefetchCommonEntities: vi.fn(),
    invalidateAll: vi.fn()
  }
}))

  }))

  toast: {
    error: vi.f
    warning: vi.fn()
}))
describ
    na
    type: 'TO_MANY
    a
  }

  beforeEach(() => {
  })
  it('renders t
    expect(screen.get

    r
   

    
      expe
      expect(screen.g
  })
  it('parses and d
      operation: 'ad
   


    expect(screen.getByText(/ID: 200
  })
  it('calls onChange with 
    
    const addButton 
    fireEvent.change(input, { t
    
      expect(mockOnChan
   

    })

    const testValue 
      ids: [100, 200, 
    

    const removeButtons = screen.getAllByRole('button', 
    )
    if (removeButtons.length > 0) {
    

        const parsed = JSON.parse(lastCall)
      })
  })
  it('updates operation type correctly', async () => {
    
    
    await waitFor(() => {
    
    
      expect(mockOnChange).toHaveBeenCalled()
      const parsed = JSON.parse(lastCall)
    })

    

    })
    const { rerender } = render(<ToMan
    
      operation: 'remove',
      subField: 'id'
    

    const replaceValue = JSON.stringify({
    
    })
    rerender(<ToManyFieldInput field={mockField} value={rep
  })


    label: 'Job Order',
    associationType: 'TO_ONE',
    


    

    render(<ToOneFieldInput fi
    
  })
  it('validates and displays lookup data for 
      id: 919540,
    }
    vi.mocked(fieldValueCache.getFieldValu
    render(<ToOneFieldInput field={mockField} val
    await waitFor(() => {
      
  })


    
      expect(screen.get
  })
  it('allows clearin
      

    vi.mocked(fieldValueCache.getFieldValueById).mockResolvedValue(mockLookupData)
    
    await waitFor(() => {
      expect(clearButton).toBe
    }
    

    const mockSearchResults = [
      


    
    fireEvent.change(searchInput, { target:
    await waitFor(() => {
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












































































































































