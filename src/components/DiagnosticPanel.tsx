import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { MagnifyingGlass, Trash, Warning, Lightning } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'

interface StoredData {
  key: string
  value: any
  size: number
  issues: string[]
  hasIssues: boolean
}

interface RateCardLineTest {
  id: string
  field: string
  value: string
}

export function DiagnosticPanel() {
  const [storedData, setStoredData] = useState<StoredData[]>([])
  const [loading, setLoading] = useState(false)
  
  const [rateCardLineId, setRateCardLineId] = useState('')
  const [rateCardLineField, setRateCardLineField] = useState('payRate')
  const [rateCardLineValue, setRateCardLineValue] = useState('')
  const [rateCardLineTesting, setRateCardLineTesting] = useState(false)
  const [rateCardLineResult, setRateCardLineResult] = useState<any>(null)

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
      await window.spark.kv.delete(key)
      toast.success(`Deleted: ${key}`)
      await scanStorage()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  const testRateCardLineGet = async () => {
    if (!rateCardLineId) {
      toast.error('Please enter a JobOrderRateCardLine ID')
      return
    }

    setRateCardLineTesting(true)
    setRateCardLineResult(null)

    try {
      console.log('🧪 Testing JobOrderRateCardLine GET:', rateCardLineId)
      
      const result = await bullhornAPI.getEntity(
        'JobOrderRateCardLine',
        parseInt(rateCardLineId),
        ['id', 'payRate', 'billRate', 'jobOrder', 'candidate', 'markupPercent', 'dateAdded', 'dateLastModified']
      )

      setRateCardLineResult({
        type: 'get',
        success: true,
        data: result
      })

      console.log('✅ JobOrderRateCardLine GET successful:', result)
      toast.success('Successfully retrieved JobOrderRateCardLine')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setRateCardLineResult({
        type: 'get',
        success: false,
        error: errorMessage
      })

      console.error('❌ JobOrderRateCardLine GET failed:', error)
      toast.error(`Failed to get JobOrderRateCardLine: ${errorMessage}`)
    } finally {
      setRateCardLineTesting(false)
    }
  }

  const testRateCardLineUpdate = async () => {
    if (!rateCardLineId) {
      toast.error('Please enter a JobOrderRateCardLine ID')
      return
    }

    if (!rateCardLineField || !rateCardLineValue) {
      toast.error('Please enter both field name and value')
      return
    }

    setRateCardLineTesting(true)
    setRateCardLineResult(null)

    try {
      console.log('🧪 Testing JobOrderRateCardLine UPDATE:', {
        id: rateCardLineId,
        field: rateCardLineField,
        value: rateCardLineValue
      })

      const updateData = {
        [rateCardLineField]: rateCardLineValue
      }

      const result = await bullhornAPI.updateEntity(
        'JobOrderRateCardLine',
        parseInt(rateCardLineId),
        updateData
      )

      setRateCardLineResult({
        type: 'update',
        success: true,
        data: result,
        updateData
      })

      console.log('✅ JobOrderRateCardLine UPDATE successful:', result)
      toast.success(`Successfully updated JobOrderRateCardLine ${rateCardLineId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setRateCardLineResult({
        type: 'update',
        success: false,
        error: errorMessage
      })

      console.error('❌ JobOrderRateCardLine UPDATE failed:', error)
      toast.error(`Failed to update JobOrderRateCardLine: ${errorMessage}`)
    } finally {
      setRateCardLineTesting(false)
    }
  }

  const testRateCardLineSearch = async () => {
    if (!rateCardLineId) {
      toast.error('Please enter a JobOrderRateCardLine ID to search for')
      return
    }

    setRateCardLineTesting(true)
    setRateCardLineResult(null)

    try {
      console.log('🧪 Testing JobOrderRateCardLine SEARCH:', rateCardLineId)

      const result = await bullhornAPI.search({
        entity: 'JobOrderRateCardLine',
        fields: ['id', 'payRate', 'billRate', 'jobOrder', 'candidate', 'markupPercent', 'dateAdded'],
        filters: [{
          field: 'id',
          operator: 'equals',
          value: rateCardLineId
        }],
        count: 500
      })

      setRateCardLineResult({
        type: 'search',
        success: true,
        data: result
      })

      console.log('✅ JobOrderRateCardLine SEARCH successful:', result)
      toast.success(`Search returned ${result.total} results`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setRateCardLineResult({
        type: 'search',
        success: false,
        error: errorMessage
      })

      console.error('❌ JobOrderRateCardLine SEARCH failed:', error)
      toast.error(`Search failed: ${errorMessage}`)
    } finally {
      setRateCardLineTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>JobOrderRateCardLine Tester</CardTitle>
          <CardDescription>
            Test GET, SEARCH, and UPDATE operations for JobOrderRateCardLine records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rate-card-line-id">JobOrderRateCardLine ID</Label>
              <Input
                id="rate-card-line-id"
                type="number"
                placeholder="e.g., 4590213"
                value={rateCardLineId}
                onChange={(e) => setRateCardLineId(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rate-card-field">Field Name</Label>
                <Input
                  id="rate-card-field"
                  placeholder="e.g., payRate"
                  value={rateCardLineField}
                  onChange={(e) => setRateCardLineField(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rate-card-value">New Value</Label>
                <Input
                  id="rate-card-value"
                  placeholder="e.g., 125"
                  value={rateCardLineValue}
                  onChange={(e) => setRateCardLineValue(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={testRateCardLineGet}
                disabled={rateCardLineTesting || !rateCardLineId}
                variant="outline"
              >
                <MagnifyingGlass />
                Test GET
              </Button>

              <Button
                onClick={testRateCardLineSearch}
                disabled={rateCardLineTesting || !rateCardLineId}
                variant="outline"
              >
                <MagnifyingGlass />
                Test SEARCH
              </Button>

              <Button
                onClick={testRateCardLineUpdate}
                disabled={rateCardLineTesting || !rateCardLineId || !rateCardLineField || !rateCardLineValue}
                variant="default"
              >
                <Lightning />
                Test UPDATE
              </Button>
            </div>
          </div>

          {rateCardLineResult && (
            <div className="mt-4">
              <Separator className="mb-4" />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={rateCardLineResult.success ? 'default' : 'destructive'}>
                    {rateCardLineResult.success ? 'Success' : 'Failed'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Operation: {rateCardLineResult.type.toUpperCase()}
                  </span>
                </div>

                {rateCardLineResult.success ? (
                  <div>
                    <p className="text-sm font-semibold mb-2">Result:</p>
                    <ScrollArea className="h-[300px]">
                      <pre className="text-xs p-3 bg-muted rounded overflow-x-auto">
                        {JSON.stringify(rateCardLineResult.data, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                ) : (
                  <Alert variant="destructive">
                    <Warning className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-semibold">Error:</p>
                      <p className="text-sm mt-1">{rateCardLineResult.error}</p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  )
}
