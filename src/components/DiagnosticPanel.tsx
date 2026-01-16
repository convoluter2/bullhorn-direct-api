import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bug, Trash, Warning, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface StoredData {
  key: string
  value: any
  size: number
  hasIssues: boolean
  issues: string[]
}

export function DiagnosticPanel() {
  const [storedData, setStoredData] = useState<StoredData[]>([])
  const [loading, setLoading] = useState(false)

  const scanStorage = async () => {
    setLoading(true)
    try {
      const keys = await window.spark.kv.keys()
      const data: StoredData[] = []

      for (const key of keys) {
        const value = await window.spark.kv.get(key)
        const valueStr = JSON.stringify(value)
        const size = new Blob([valueStr]).size

        const issues: string[] = []
        let hasIssues = false

        if (valueStr.includes('candidateSource')) {
          issues.push('Contains invalid field: candidateSource')
          hasIssues = true
        }

        if (key.includes('query') || key.includes('field') || key.includes('filter')) {
          if (value && typeof value === 'object') {
            if (Array.isArray(value)) {
              value.forEach((item: any, idx: number) => {
                if (item?.field === 'candidateSource') {
                  issues.push(`Array item ${idx} has candidateSource field`)
                  hasIssues = true
                }
              })
            } else {
              const obj = value as any
              if (obj.selectedFields && Array.isArray(obj.selectedFields)) {
                if (obj.selectedFields.includes('candidateSource')) {
                  issues.push('selectedFields array contains candidateSource')
                  hasIssues = true
                }
              }
            }
          }
        }

        data.push({
          key,
          value,
          size,
          hasIssues,
          issues
        })
      }

      data.sort((a, b) => {
        if (a.hasIssues && !b.hasIssues) return -1
        if (!a.hasIssues && b.hasIssues) return 1
        return b.size - a.size
      })

      setStoredData(data)
      
      const issueCount = data.filter(d => d.hasIssues).length
      if (issueCount > 0) {
        toast.warning(`Found ${issueCount} items with potential issues`)
      } else {
        toast.success('No issues found in stored data')
      }
    } catch (error) {
      console.error('Error scanning storage:', error)
      toast.error('Failed to scan storage')
    } finally {
      setLoading(false)
    }
  }

  const deleteKey = async (key: string) => {
    if (!confirm(`Delete key: ${key}?`)) return
    
    try {
      await window.spark.kv.delete(key)
      toast.success(`Deleted ${key}`)
      scanStorage()
    } catch (error) {
      console.error('Error deleting key:', error)
      toast.error('Failed to delete key')
    }
  }

  const fixCandidateSourceIssues = async () => {
    const itemsToFix = storedData.filter(d => d.hasIssues)
    
    if (itemsToFix.length === 0) {
      toast.info('No issues to fix')
      return
    }

    if (!confirm(`Fix ${itemsToFix.length} items by removing candidateSource references?`)) {
      return
    }

    let fixed = 0
    for (const item of itemsToFix) {
      try {
        let modified = false
        let value = item.value

        if (Array.isArray(value)) {
          const newValue = value.filter((v: any) => v?.field !== 'candidateSource')
          if (newValue.length !== value.length) {
            value = newValue
            modified = true
          }
        } else if (value && typeof value === 'object') {
          if (value.selectedFields && Array.isArray(value.selectedFields)) {
            const newFields = value.selectedFields.filter((f: string) => f !== 'candidateSource')
            if (newFields.length !== value.selectedFields.length) {
              value = { ...value, selectedFields: newFields }
              modified = true
            }
          }
        }

        if (modified) {
          await window.spark.kv.set(item.key, value)
          fixed++
        }
      } catch (error) {
        console.error(`Error fixing ${item.key}:`, error)
      }
    }

    toast.success(`Fixed ${fixed} items`)
    scanStorage()
  }

  useEffect(() => {
    scanStorage()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bug size={24} />
              Storage Diagnostics
            </CardTitle>
            <CardDescription>
              Scan and fix issues in stored data
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={scanStorage}
              disabled={loading}
            >
              {loading ? 'Scanning...' : 'Rescan'}
            </Button>
            {storedData.some(d => d.hasIssues) && (
              <Button 
                variant="default" 
                size="sm"
                onClick={fixCandidateSourceIssues}
              >
                Auto-Fix Issues
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {storedData.some(d => d.hasIssues) && (
          <Alert className="mb-4 border-yellow-500 bg-yellow-500/10">
            <Warning className="h-4 w-4 text-yellow-500" />
            <AlertDescription>
              Found {storedData.filter(d => d.hasIssues).length} items with potential issues.
              The field 'candidateSource' does not exist on JobSubmission. You may need to use 'candidate.source' instead.
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {storedData.map((item) => (
              <div
                key={item.key}
                className={`border rounded-lg p-3 ${
                  item.hasIssues ? 'border-yellow-500 bg-yellow-500/5' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.hasIssues ? (
                        <Warning size={16} className="text-yellow-500 flex-shrink-0" />
                      ) : (
                        <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                      )}
                      <code className="text-sm font-mono truncate">{item.key}</code>
                      <Badge variant="outline" className="text-xs">
                        {(item.size / 1024).toFixed(2)} KB
                      </Badge>
                    </div>
                    
                    {item.hasIssues && (
                      <div className="ml-6 space-y-1">
                        {item.issues.map((issue, idx) => (
                          <p key={idx} className="text-xs text-yellow-600 dark:text-yellow-400">
                            ⚠ {issue}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    <details className="ml-6 mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        View data
                      </summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                        {JSON.stringify(item.value, null, 2)}
                      </pre>
                    </details>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteKey(item.key)}
                    className="flex-shrink-0"
                  >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {storedData.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            No stored data found
          </p>
        )}
      </CardContent>
    </Card>
  )
}
