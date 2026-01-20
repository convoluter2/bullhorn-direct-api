import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { MagnifyingGlass, Trash, Warning } from '@phosphor-icons/react'

interface StoredData {
  key: string
  value: any
  size: number
  issues: string[]
  hasIssues: boolean
}

export function DiagnosticPanel() {
  const [storedData, setStoredData] = useState<StoredData[]>([])
  const [loading, setLoading] = useState(false)

  const scanStorage = async () => {
    setLoading(true)
    try {
      const keys = await spark.kv.keys()
      const data: StoredData[] = []

      for (const key of keys) {
        const value = await spark.kv.get(key)
        const valueStr = JSON.stringify(value)
        const size = new Blob([valueStr]).size

        const issues: string[] = []
        let hasIssues = false

        if (valueStr.includes('candidateSource') && valueStr.includes('selectedFields')) {
          issues.push('Contains candidateSource reference in selectedFields')
          hasIssues = true
        }

        if (size > 500000) {
          issues.push(`Large data size: ${(size / 1024).toFixed(2)} KB`)
          hasIssues = true
        }

        data.push({
          key,
          value,
          size,
          issues,
          hasIssues,
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
        toast.warning(`Found ${issueCount} items with issues`)
      } else {
        toast.success(`Scanned ${data.length} items - no issues found`)
      }
    } catch (error) {
      console.error('Error scanning storage:', error)
      toast.error('Failed to scan storage')
    } finally {
      setLoading(false)
    }
  }

  const deleteItem = async (key: string) => {
    if (!confirm(`Delete storage key: ${key}?`)) return

    try {
      await spark.kv.delete(key)
      toast.success(`Deleted: ${key}`)
      await scanStorage()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Storage Diagnostics</CardTitle>
            <CardDescription>
              Scan and analyze stored data for potential issues
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={scanStorage}
            disabled={loading}
          >
            <MagnifyingGlass />
            {loading ? 'Scanning...' : 'Scan Storage'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {storedData.some(d => d.hasIssues) && (
          <Alert variant="destructive">
            <Warning className="h-4 w-4" />
            <AlertDescription>
              Found {storedData.filter(d => d.hasIssues).length} items with issues
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {storedData.map((item) => (
              <div
                key={item.key}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm font-semibold">{item.key}</code>
                    {item.hasIssues ? (
                      <Badge variant="destructive">Issues Found</Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {(item.size / 1024).toFixed(2)} KB
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteItem(item.key)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {item.issues.length > 0 && (
                  <div className="space-y-1">
                    {item.issues.map((issue, idx) => (
                      <p key={idx} className="text-xs text-yellow-600 dark:text-yellow-500">
                        ⚠️ {issue}
                      </p>
                    ))}
                  </div>
                )}

                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View data
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                    {JSON.stringify(item.value, null, 2)}
                  </pre>
                </details>
              </div>
            ))}

            {storedData.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">
                Click "Scan Storage" to analyze stored data
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
