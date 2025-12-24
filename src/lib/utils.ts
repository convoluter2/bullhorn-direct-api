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
