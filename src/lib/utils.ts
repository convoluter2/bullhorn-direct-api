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

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      }
    }

    if (typeof value === 'function') {
      return '[Function]'
    }

    if (Array.isArray(value)) {
      if (value.length > 100) {
        return [
          ...value.slice(0, 100).map(item => sanitize(item, depth + 1)),
          `... ${value.length - 100} more items`
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
      
      if (keys.length > 50) {
        for (let i = 0; i < 50; i++) {
          const key = keys[i]
          result[key] = sanitize(value[key], depth + 1)
        }
        result['...'] = `${keys.length - 50} more properties`
      } else {
        for (const key of keys) {
          result[key] = sanitize(value[key], depth + 1)
        }
      }
      
      return result
    }

    return value
  }

  return sanitize(details, 0)
}
