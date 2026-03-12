import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EntityField } from '@/hooks/use-entity-metadata'
vi.mock('@/lib/field-value-cache', () => ({
    getFieldValues: vi.fn(),

    invalidateAll: vi.fn()
}))
vi.mock('sonner', () => ({
    error: vi.fn(),
  }

  bullhornAPI: {
  }


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
    associatedEntity: { 
  }
  const mockOnChange = vi.fn()
  beforeEach(() => {
  })
  i

    expect(screen.getByPlaceho









































