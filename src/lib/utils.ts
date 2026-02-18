import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFieldLabel(label: string, fieldName: string): string {
  if (label === fieldName || !label) {
    return fieldName
  }
  return `${label} (${fieldName})`
}

export function formatFieldValue(value: any): string {
  if (value === null || value === undefined) {
    return '-'
  }
  
  if (typeof value === 'object' && !Array.isArray(value)) {
    if (value.id !== undefined) {
      const parts: string[] = [`ID: ${value.id}`]
      
      if (value.name) {
        parts.push(value.name)
      } else if (value.title) {
        parts.push(value.title)
      } else if (value.firstName && value.lastName) {
        parts.push(`${value.firstName} ${value.lastName}`)
      } else if (value.firstName) {
        parts.push(value.firstName)
      } else if (value.lastName) {
        parts.push(value.lastName)
      }
      
      return parts.join(' - ')
    }
    
    return JSON.stringify(value)
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]'
    }
    return `[${value.length} items]`
  }
  
  return String(value)
}

export function sanitizeLogDetails(details: any, maxDepth: number = 3): any {
  if (details === null || details === undefined) {
    return details
  }

  const seen = new WeakSet()
  const MAX_STRING_LENGTH = 10000
  const MAX_ARRAY_LENGTH = 50
  const MAX_OBJECT_KEYS = 30

  function sanitize(value: any, depth: number): any {
    if (depth > maxDepth) {
      if (Array.isArray(value)) {
        return `[Array: ${value.length} items, depth limit reached]`
      }
      if (typeof value === 'object' && value !== null) {
        return '[Object: depth limit reached]'
      }
      return value
    }

    if (value === null || value === undefined) {
      return value
    }

    if (typeof value === 'string') {
      if (value.length > MAX_STRING_LENGTH) {
        return `${value.substring(0, MAX_STRING_LENGTH)}... [truncated, original length: ${value.length}]`
      }
      return value
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack ? value.stack.substring(0, 1000) : undefined
      }
    }

    if (value instanceof Blob || value instanceof File) {
      return `[${value.constructor.name}: ${value.size} bytes]`
    }

    if (value instanceof FormData) {
      return '[FormData]'
    }

    if (typeof value === 'function') {
      return '[Function]'
    }

    if (ArrayBuffer.isView(value)) {
      return `[Binary Data: ${value.byteLength} bytes]`
    }

    if (value instanceof ArrayBuffer) {
      return `[Binary Data: ${value.byteLength} bytes]`
    }

    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_LENGTH) {
        return [
          ...value.slice(0, MAX_ARRAY_LENGTH).map(item => sanitize(item, depth + 1)),
          `... ${value.length - MAX_ARRAY_LENGTH} more items`
        ]
      }
      return value.map(item => sanitize(item, depth + 1))
    }

    if (typeof value === 'object') {
      if (seen.has(value)) {
        return '[Circular Reference]'
      }
      seen.add(value)

      const result: any = {}
      const keys = Object.keys(value)
      
      if (keys.length > MAX_OBJECT_KEYS) {
        for (let i = 0; i < MAX_OBJECT_KEYS; i++) {
          const key = keys[i]
          result[key] = sanitize(value[key], depth + 1)
        }
        result['...'] = `${keys.length - MAX_OBJECT_KEYS} more properties`
      } else {
        for (const key of keys) {
          result[key] = sanitize(value[key], depth + 1)
        }
      }
      
      const resultStr = JSON.stringify(result)
      if (resultStr.length > 100000) {
        return { 
          _truncated: true, 
          _originalSize: resultStr.length,
          _summary: `Large object with ${keys.length} keys`
        }
      }
      
      return result
    }

    return value
  }

  const sanitized = sanitize(details, 0)
  
  const sanitizedStr = JSON.stringify(sanitized)
  if (sanitizedStr && sanitizedStr.length > 400000) {
    return {
      _truncated: true,
      _error: 'Log details too large for storage',
      _originalSizeEstimate: `${Math.round(sanitizedStr.length / 1024)}KB`,
      _limit: '400KB'
    }
  }
  
  return sanitized
}
