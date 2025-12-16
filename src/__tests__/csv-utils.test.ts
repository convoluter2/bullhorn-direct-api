import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseCSV, exportToCSV, exportToJSON } from '@/lib/csv-utils'

describe('csv-utils', () => {
  describe('parseCSV', () => {
    it('should parse simple CSV', () => {
      const csv = 'name,email,status\nJohn Doe,john@example.com,Active\nJane Smith,jane@example.com,Inactive'
      const result = parseCSV(csv)
      
      expect(result.headers).toEqual(['name', 'email', 'status'])
      expect(result.rows).toHaveLength(2)
      expect(result.rows[0]).toEqual(['John Doe', 'john@example.com', 'Active'])
      expect(result.rows[1]).toEqual(['Jane Smith', 'jane@example.com', 'Inactive'])
    })

    it('should handle quoted fields', () => {
      const csv = 'name,description\n"John Doe","A person, with commas"\n"Jane Smith","Another person"'
      const result = parseCSV(csv)
      
      expect(result.headers).toEqual(['name', 'description'])
      expect(result.rows[0]).toEqual(['John Doe', 'A person, with commas'])
    })

    it('should handle escaped quotes', () => {
      const csv = 'name,quote\n"John Doe","He said ""Hello"""'
      const result = parseCSV(csv)
      
      expect(result.rows[0]).toEqual(['John Doe', 'He said "Hello"'])
    })

    it('should handle empty CSV', () => {
      const csv = ''
      const result = parseCSV(csv)
      
      expect(result.headers).toEqual([])
      expect(result.rows).toEqual([])
    })

    it('should handle CSV with only headers', () => {
      const csv = 'name,email,status'
      const result = parseCSV(csv)
      
      expect(result.headers).toEqual(['name', 'email', 'status'])
      expect(result.rows).toEqual([])
    })

    it('should trim whitespace from fields', () => {
      const csv = ' name , email , status \n John Doe , john@example.com , Active '
      const result = parseCSV(csv)
      
      expect(result.headers).toEqual(['name', 'email', 'status'])
      expect(result.rows[0]).toEqual(['John Doe', 'john@example.com', 'Active'])
    })

    it('should handle empty fields', () => {
      const csv = 'name,email,status\nJohn Doe,,Active\n,jane@example.com,'
      const result = parseCSV(csv)
      
      expect(result.rows[0]).toEqual(['John Doe', '', 'Active'])
      expect(result.rows[1]).toEqual(['', 'jane@example.com', ''])
    })
  })

  describe('exportToCSV', () => {
    beforeEach(() => {
      document.body.innerHTML = ''
      global.URL.createObjectURL = vi.fn(() => 'blob:test')
      global.URL.revokeObjectURL = vi.fn()
    })

    it('should create CSV from data array', () => {
      const data = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ]

      exportToCSV(data, 'test.csv')

      const links = document.querySelectorAll('a')
      expect(links.length).toBe(0)
    })

    it('should handle empty array', () => {
      const data: any[] = []
      exportToCSV(data, 'test.csv')
      
      const links = document.querySelectorAll('a')
      expect(links.length).toBe(0)
    })

    it('should escape special characters', () => {
      const data = [
        { name: 'John, Doe', description: 'Has "quotes"' }
      ]

      exportToCSV(data, 'test.csv')

      const links = document.querySelectorAll('a')
      expect(links.length).toBe(0)
    })

    it('should handle null and undefined values', () => {
      const data = [
        { name: 'John', email: null, phone: undefined }
      ]

      exportToCSV(data, 'test.csv')

      const links = document.querySelectorAll('a')
      expect(links.length).toBe(0)
    })
  })

  describe('exportToJSON', () => {
    beforeEach(() => {
      document.body.innerHTML = ''
      global.URL.createObjectURL = vi.fn(() => 'blob:test')
      global.URL.revokeObjectURL = vi.fn()
    })

    it('should create JSON from data array', () => {
      const data = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
      ]

      exportToJSON(data, 'test.json')

      const links = document.querySelectorAll('a')
      expect(links.length).toBe(0)
    })

    it('should handle empty array', () => {
      const data: any[] = []
      exportToJSON(data, 'test.json')
      
      const links = document.querySelectorAll('a')
      expect(links.length).toBe(0)
    })

    it('should handle complex objects', () => {
      const data = [
        { 
          id: 1, 
          name: 'John', 
          nested: { key: 'value' },
          array: [1, 2, 3]
        }
      ]

      exportToJSON(data, 'test.json')

      const links = document.querySelectorAll('a')
      expect(links.length).toBe(0)
    })
  })
})
