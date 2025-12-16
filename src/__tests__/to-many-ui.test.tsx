import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToManyFieldInput } from '@/components/ToManyFieldInput'
import type { EntityField } from '@/hooks/use-entity-metadata'

describe('ToManyFieldInput Component', () => {
  const mockField: EntityField = {
    name: 'certifications',
    type: 'TO_MANY',
    dataType: 'Integer',
    label: 'Certifications',
    associationType: 'TO_MANY',
    associatedEntity: {
      entity: 'Certification',
      entityMetaUrl: '/meta/Certification'
    }
  }

  let mockOnChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnChange = vi.fn()
  })

  describe('Rendering', () => {
    it('should render all main components', () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('To-Many Operation')).toBeInTheDocument()
      expect(screen.getByText('Association IDs')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter IDs (comma or space separated)')).toBeInTheDocument()
    })

    it('should render operation dropdown with all options', () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      const operationSelect = screen.getByRole('combobox')
      expect(operationSelect).toBeInTheDocument()
    })

    it('should show operation details', () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/Operation Details:/)).toBeInTheDocument()
    })
  })

  describe('Adding IDs', () => {
    it('should add single ID when Add button is clicked', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)')
      const addButton = screen.getByRole('button', { name: /Add/i })

      fireEvent.change(input, { target: { value: '123' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })

      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      const parsed = JSON.parse(lastCall)
      expect(parsed.ids).toContain(123)
    })

    it('should add multiple comma-separated IDs', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)')
      const addButton = screen.getByRole('button', { name: /Add/i })

      fireEvent.change(input, { target: { value: '123, 456, 789' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })

      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      const parsed = JSON.parse(lastCall)
      expect(parsed.ids).toEqual([123, 456, 789])
    })

    it('should add multiple space-separated IDs', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)')
      const addButton = screen.getByRole('button', { name: /Add/i })

      fireEvent.change(input, { target: { value: '111 222 333' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })

      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      const parsed = JSON.parse(lastCall)
      expect(parsed.ids).toEqual([111, 222, 333])
    })

    it('should add IDs on Enter key press', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)')

      fireEvent.change(input, { target: { value: '999' } })
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })

      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      const parsed = JSON.parse(lastCall)
      expect(parsed.ids).toContain(999)
    })

    it('should filter out duplicate IDs', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value='{"operation":"add","ids":[123]}'
          onChange={mockOnChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)')
      const addButton = screen.getByRole('button', { name: /Add/i })

      fireEvent.change(input, { target: { value: '123, 456' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })

      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      const parsed = JSON.parse(lastCall)
      expect(parsed.ids).toHaveLength(2)
      expect(parsed.ids.filter((id: number) => id === 123)).toHaveLength(1)
    })

    it('should ignore invalid ID values', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)')
      const addButton = screen.getByRole('button', { name: /Add/i })

      fireEvent.change(input, { target: { value: 'abc, 123, xyz, 456' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })

      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
      const parsed = JSON.parse(lastCall)
      expect(parsed.ids).toEqual([123, 456])
    })

    it('should clear input after adding IDs', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)') as HTMLInputElement
      const addButton = screen.getByRole('button', { name: /Add/i })

      fireEvent.change(input, { target: { value: '123' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })
  })

  describe('Removing IDs', () => {
    it('should display added IDs as badges', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value='{"operation":"add","ids":[123,456,789]}'
          onChange={mockOnChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('123')).toBeInTheDocument()
        expect(screen.getByText('456')).toBeInTheDocument()
        expect(screen.getByText('789')).toBeInTheDocument()
      })
    })

    it('should show ID count', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value='{"operation":"add","ids":[123,456,789]}'
          onChange={mockOnChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('3 ID(s) selected')).toBeInTheDocument()
      })
    })

    it('should remove individual ID when X is clicked', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value='{"operation":"add","ids":[123,456,789]}'
          onChange={mockOnChange}
        />
      )

      await waitFor(() => {
        const badges = screen.getAllByRole('button').filter(btn => 
          btn.parentElement?.textContent?.includes('123')
        )
        if (badges.length > 0) {
          fireEvent.click(badges[0])
        }
      })

      await waitFor(() => {
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
        const parsed = JSON.parse(lastCall)
        expect(parsed.ids).not.toContain(123)
      })
    })

    it('should clear all IDs when Clear all is clicked', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value='{"operation":"add","ids":[123,456,789]}'
          onChange={mockOnChange}
        />
      )

      const clearButton = screen.getByRole('button', { name: /Clear all/i })
      fireEvent.click(clearButton)

      await waitFor(() => {
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
        const parsed = JSON.parse(lastCall)
        expect(parsed.ids).toHaveLength(0)
      })
    })
  })

  describe('Operation selection', () => {
    it('should update operation when changed', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value='{"operation":"add","ids":[123]}'
          onChange={mockOnChange}
        />
      )

      const operationSelect = screen.getByRole('combobox')
      fireEvent.click(operationSelect)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
      })
    })

    it('should display correct operation details for add', () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value='{"operation":"add","ids":[]}'
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/IDs will be added to existing/)).toBeInTheDocument()
    })

    it('should display correct operation details for remove', () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value='{"operation":"remove","ids":[]}'
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/IDs will be removed from/)).toBeInTheDocument()
    })

    it('should display correct operation details for replace', () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value='{"operation":"replace","ids":[]}'
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/All existing .* will be removed and replaced/)).toBeInTheDocument()
    })
  })

  describe('Disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)')
      expect(input).toBeDisabled()
    })

    it('should disable Add button when disabled prop is true', () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      )

      const addButton = screen.getByRole('button', { name: /Add/i })
      expect(addButton).toBeDisabled()
    })

    it('should disable operation select when disabled prop is true', () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      )

      const operationSelect = screen.getByRole('combobox')
      expect(operationSelect).toBeDisabled()
    })
  })

  describe('Value initialization', () => {
    it('should initialize with empty state when value is empty', () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      expect(screen.queryByText(/\d+ ID\(s\) selected/)).not.toBeInTheDocument()
    })

    it('should initialize with parsed JSON value', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value='{"operation":"remove","ids":[100,200,300]}'
          onChange={mockOnChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('200')).toBeInTheDocument()
        expect(screen.getByText('300')).toBeInTheDocument()
        expect(screen.getByText('3 ID(s) selected')).toBeInTheDocument()
      })
    })

    it('should parse legacy comma-separated format', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value="100,200,300"
          onChange={mockOnChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('200')).toBeInTheDocument()
        expect(screen.getByText('300')).toBeInTheDocument()
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle null field gracefully', () => {
      render(
        <ToManyFieldInput
          field={null}
          value=""
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText(/associations/)).toBeInTheDocument()
    })

    it('should handle very large number of IDs', async () => {
      const largeIds = Array.from({ length: 100 }, (_, i) => i + 1)
      const value = JSON.stringify({ operation: 'add', ids: largeIds })

      render(
        <ToManyFieldInput
          field={mockField}
          value={value}
          onChange={mockOnChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('100 ID(s) selected')).toBeInTheDocument()
      })
    })

    it('should handle whitespace-only input', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)')
      const addButton = screen.getByRole('button', { name: /Add/i })

      fireEvent.change(input, { target: { value: '   ' } })
      
      expect(addButton).toBeDisabled()
    })

    it('should handle mixed valid and invalid input', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)')
      const addButton = screen.getByRole('button', { name: /Add/i })

      fireEvent.change(input, { target: { value: '123, abc, 456, , 789' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
        const parsed = JSON.parse(lastCall)
        expect(parsed.ids).toEqual([123, 456, 789])
      })
    })
  })

  describe('Callback behavior', () => {
    it('should call onChange with stringified JSON', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value=""
          onChange={mockOnChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)')
      const addButton = screen.getByRole('button', { name: /Add/i })

      fireEvent.change(input, { target: { value: '123' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled()
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
        expect(typeof lastCall).toBe('string')
        expect(() => JSON.parse(lastCall)).not.toThrow()
      })
    })

    it('should include operation in callback', async () => {
      render(
        <ToManyFieldInput
          field={mockField}
          value='{"operation":"replace","ids":[]}'
          onChange={mockOnChange}
        />
      )

      const input = screen.getByPlaceholderText('Enter IDs (comma or space separated)')
      const addButton = screen.getByRole('button', { name: /Add/i })

      fireEvent.change(input, { target: { value: '555' } })
      fireEvent.click(addButton)

      await waitFor(() => {
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
        const parsed = JSON.parse(lastCall)
        expect(parsed.operation).toBe('replace')
      })
    })
  })
})
