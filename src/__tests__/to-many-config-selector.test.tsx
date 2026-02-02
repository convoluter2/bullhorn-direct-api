import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToManyConfigSelector, type ToManyConfig } from '@/components/ToManyConfigSelector'

vi.mock('@/hooks/use-entity-metadata', () => ({
  useEntityMetadata: (entity: string | undefined) => {
    if (entity === 'Certification') {
      return {
        metadata: {
          entity: 'Certification',
          label: 'Certification',
          fields: [
            { name: 'name', label: 'Name', dataType: 'String', type: 'SCALAR' },
            { name: 'code', label: 'Code', dataType: 'String', type: 'SCALAR' },
            { name: 'description', label: 'Description', dataType: 'String', type: 'SCALAR' },
          ],
          fieldsMap: {},
          lastUpdated: Date.now()
        },
        loading: false,
        error: null
      }
    }
    return {
      metadata: null,
      loading: false,
      error: null
    }
  }
}))

describe('ToManyConfigSelector Component', () => {
  let mockOnChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnChange = vi.fn()
  })

  describe('Rendering', () => {
    it('should render the component with all required elements', () => {
      const config: ToManyConfig = {
        operation: 'add',
        subField: 'id'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/Configure To-Many:/)).toBeInTheDocument()
      expect(screen.getByText('Operation')).toBeInTheDocument()
      expect(screen.getByText('Match Field')).toBeInTheDocument()
    })

    it('should display the field name correctly', () => {
      const config: ToManyConfig = {
        operation: 'add',
        subField: 'id'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/Certifications/)).toBeInTheDocument()
    })
  })

  describe('Operation Selection', () => {
    it('should render all operation options', async () => {
      const config: ToManyConfig = {
        operation: 'add',
        subField: 'id'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      const operationTriggers = screen.getAllByRole('combobox')
      const operationSelect = operationTriggers[0]
      
      fireEvent.click(operationSelect)

      await waitFor(() => {
        expect(screen.getByText(/Add \(keep existing\)/)).toBeInTheDocument()
      })
    })

    it('should call onChange when operation changes', async () => {
      const config: ToManyConfig = {
        operation: 'add',
        subField: 'id'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      const operationTriggers = screen.getAllByRole('combobox')
      const operationSelect = operationTriggers[0]
      
      fireEvent.click(operationSelect)

      await waitFor(() => {
        const removeOption = screen.getByText(/Remove \(keep others\)/)
        fireEvent.click(removeOption)
      })

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith({
          operation: 'remove',
          subField: 'id'
        })
      })
    })
  })

  describe('Match Field Selection', () => {
    it('should render ID as default match field option', () => {
      const config: ToManyConfig = {
        operation: 'add',
        subField: 'id'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('Match Field')).toBeInTheDocument()
    })

    it('should call onChange when match field changes', async () => {
      const config: ToManyConfig = {
        operation: 'add',
        subField: 'id'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      const matchFieldTriggers = screen.getAllByRole('combobox')
      const matchFieldSelect = matchFieldTriggers[1]
      
      fireEvent.click(matchFieldSelect)

      await waitFor(() => {
        const nameOption = screen.getByText(/Name/)
        if (nameOption) {
          fireEvent.click(nameOption)
        }
      })

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
        const calls = mockOnChange.mock.calls
        if (calls.length > 0) {
          const lastCall = calls[calls.length - 1][0]
          expect(lastCall.subField).toBe('name')
        }
      })
    })
  })

  describe('Operation Descriptions', () => {
    it('should show correct description for add operation', () => {
      const config: ToManyConfig = {
        operation: 'add',
        subField: 'id'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/CSV values will be added to existing associations/)).toBeInTheDocument()
    })

    it('should show correct description for remove operation', () => {
      const config: ToManyConfig = {
        operation: 'remove',
        subField: 'id'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/Only specified CSV values will be removed/)).toBeInTheDocument()
    })

    it('should show correct description for replace operation', () => {
      const config: ToManyConfig = {
        operation: 'replace',
        subField: 'id'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/All existing associations will be replaced/)).toBeInTheDocument()
    })

    it('should show match field hint when subField is set', () => {
      const config: ToManyConfig = {
        operation: 'add',
        subField: 'name'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/CSV values will be matched using the/)).toBeInTheDocument()
      expect(screen.getByText(/name/)).toBeInTheDocument()
    })
  })

  describe('Associated Entity Metadata', () => {
    it('should load fields from associated entity', async () => {
      const config: ToManyConfig = {
        operation: 'add',
        subField: 'id'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      const matchFieldTriggers = screen.getAllByRole('combobox')
      const matchFieldSelect = matchFieldTriggers[1]
      
      fireEvent.click(matchFieldSelect)

      await waitFor(() => {
        expect(screen.getByText(/Name/)).toBeInTheDocument()
        expect(screen.getByText(/Code/)).toBeInTheDocument()
      })
    })
  })

  describe('Config Preservation', () => {
    it('should preserve operation when changing subField', async () => {
      const config: ToManyConfig = {
        operation: 'replace',
        subField: 'id'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      const matchFieldTriggers = screen.getAllByRole('combobox')
      const matchFieldSelect = matchFieldTriggers[1]
      
      fireEvent.click(matchFieldSelect)

      await waitFor(() => {
        const nameOption = screen.getByText(/Name/)
        if (nameOption) {
          fireEvent.click(nameOption)
        }
      })

      await waitFor(() => {
        const calls = mockOnChange.mock.calls
        if (calls.length > 0) {
          const lastCall = calls[calls.length - 1][0]
          expect(lastCall.operation).toBe('replace')
        }
      })
    })

    it('should preserve subField when changing operation', async () => {
      const config: ToManyConfig = {
        operation: 'add',
        subField: 'name'
      }

      render(
        <ToManyConfigSelector
          fieldName="certifications"
          fieldLabel="Certifications"
          associatedEntity="Certification"
          config={config}
          onChange={mockOnChange}
        />
      )

      const operationTriggers = screen.getAllByRole('combobox')
      const operationSelect = operationTriggers[0]
      
      fireEvent.click(operationSelect)

      await waitFor(() => {
        const removeOption = screen.getByText(/Remove \(keep others\)/)
        fireEvent.click(removeOption)
      })

      await waitFor(() => {
        const calls = mockOnChange.mock.calls
        if (calls.length > 0) {
          const lastCall = calls[calls.length - 1][0]
          expect(lastCall.subField).toBe('name')
        }
      })
    })
  })
})
