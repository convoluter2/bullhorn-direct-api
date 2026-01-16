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
