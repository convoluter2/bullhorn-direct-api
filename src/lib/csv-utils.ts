export function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.split('\n').filter(line => line.trim())
  
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map(line => parseCSVLine(line))

  return { headers, rows }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

export function exportToCSV(data: any[], filename: string = 'export.csv') {
  if (data.length === 0) {
    console.warn('exportToCSV: No data to export')
    return
  }

  try {
    const headers = Object.keys(data[0])
    const csvLines = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          const stringValue = value === null || value === undefined ? '' : String(value)
          return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue
        }).join(',')
      )
    ]

    const csvContent = csvLines.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 100)
    
    console.log(`✅ CSV exported: ${filename} (${data.length} records)`)
  } catch (error) {
    console.error('exportToCSV error:', error)
    throw error
  }
}

export function exportToJSON(data: any[], filename: string = 'export.json') {
  if (data.length === 0) {
    console.warn('exportToJSON: No data to export')
    return
  }

  try {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 100)
    
    console.log(`✅ JSON exported: ${filename} (${data.length} records)`)
  } catch (error) {
    console.error('exportToJSON error:', error)
    throw error
  }
}
