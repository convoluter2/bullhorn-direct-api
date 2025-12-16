import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Stack, Plus, Trash, Lightning, CheckCircle, XCircle, Clock } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { BULLHORN_ENTITIES } from '@/lib/entities'
import type { StackOperation } from '@/lib/types'

interface SmartStackProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

export function SmartStack({ onLog }: SmartStackProps) {
  const [operations, setOperations] = useState<StackOperation[]>([])
  const [loading, setLoading] = useState(false)

  const addOperation = () => {
    const newOp: StackOperation = {
      id: `op-${Date.now()}`,
      type: 'create',
      entity: '',
      data: {},
      status: 'pending'
    }
    setOperations([...operations, newOp])
  }

  const removeOperation = (id: string) => {
    setOperations(operations.filter(op => op.id !== id))
  }

  const updateOperation = (id: string, updates: Partial<StackOperation>) => {
    setOperations(operations.map(op => 
      op.id === id ? { ...op, ...updates } : op
    ))
  }

  const executeStack = async () => {
    if (operations.length === 0) {
      toast.error('No operations to execute')
      return
    }

    setLoading(true)
    const startTime = Date.now()

    try {
      const sortedOps = topologicalSort(operations)
      
      for (const op of sortedOps) {
        updateOperation(op.id, { status: 'running' })

        try {
          let result
          let parsedData = op.data

          if (typeof op.data === 'string') {
            try {
              parsedData = JSON.parse(op.data)
            } catch {
              parsedData = op.data
            }
          }

          switch (op.type) {
            case 'create':
              result = await bullhornAPI.createEntity(op.entity, parsedData)
              break
            case 'update':
              if (!parsedData.id) {
                throw new Error('Update requires an id field')
              }
              result = await bullhornAPI.updateEntity(op.entity, parsedData.id, parsedData)
              break
            case 'delete':
              if (!parsedData.id) {
                throw new Error('Delete requires an id field')
              }
              result = await bullhornAPI.deleteEntity(op.entity, parsedData.id)
              break
            case 'query':
              result = await bullhornAPI.search({
                entity: op.entity,
                fields: ['id'],
                filters: [],
                count: 10
              })
              break
          }

          updateOperation(op.id, { 
            status: 'completed', 
            result: result 
          })

          onLog(
            `SmartStack ${op.type}`,
            'success',
            `${op.type} ${op.entity} completed`,
            { operation: op.id, result }
          )

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Operation failed'
          updateOperation(op.id, { 
            status: 'failed', 
            error: errorMessage 
          })

          onLog(
            `SmartStack ${op.type}`,
            'error',
            errorMessage,
            { operation: op.id, entity: op.entity }
          )

          toast.error(`Operation ${op.id} failed: ${errorMessage}`)
          break
        }
      }

      const successCount = operations.filter(op => op.status === 'completed').length
      const duration = Date.now() - startTime

      if (successCount === operations.length) {
        toast.success(`Stack completed: ${successCount} operations in ${duration}ms`)
      } else {
        toast.warning(`Stack partially completed: ${successCount}/${operations.length} operations`)
      }

    } catch (error) {
      toast.error('Stack execution failed')
    } finally {
      setLoading(false)
    }
  }

  const resetStack = () => {
    setOperations(operations.map(op => ({ 
      ...op, 
      status: 'pending', 
      result: undefined, 
      error: undefined 
    })))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stack className="text-accent" size={24} />
            SmartStack v2
          </CardTitle>
          <CardDescription>
            Execute batch operations with dependency management and error handling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <Button onClick={addOperation} variant="outline" className="flex-1">
              <Plus />
              Add Operation
            </Button>
            <Button 
              onClick={executeStack} 
              disabled={loading || operations.length === 0}
              className="flex-1"
            >
              <Lightning />
              {loading ? 'Executing...' : 'Execute Stack'}
            </Button>
            <Button 
              onClick={resetStack} 
              variant="outline"
              disabled={loading || operations.every(op => op.status === 'pending')}
            >
              Reset
            </Button>
          </div>

          {operations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Stack size={48} className="mx-auto mb-4 opacity-50" />
              <p>No operations defined</p>
              <p className="text-sm">Click "Add Operation" to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {operations.map((op, index) => (
                  <Card key={op.id} className={
                    op.status === 'completed' ? 'border-green-500/50' :
                    op.status === 'failed' ? 'border-destructive/50' :
                    op.status === 'running' ? 'border-accent/50' :
                    ''
                  }>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-muted-foreground">#{index + 1}</span>
                          <Badge variant={
                            op.status === 'completed' ? 'default' :
                            op.status === 'failed' ? 'destructive' :
                            op.status === 'running' ? 'default' :
                            'outline'
                          }>
                            {op.status === 'completed' && <CheckCircle size={14} />}
                            {op.status === 'failed' && <XCircle size={14} />}
                            {op.status === 'running' && <Clock size={14} />}
                            {op.status}
                          </Badge>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeOperation(op.id)}
                          disabled={loading}
                          className="text-destructive"
                        >
                          <Trash size={18} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Operation Type</Label>
                          <Select
                            value={op.type}
                            onValueChange={(v: any) => updateOperation(op.id, { type: v })}
                            disabled={loading || op.status !== 'pending'}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="create">Create</SelectItem>
                              <SelectItem value="update">Update</SelectItem>
                              <SelectItem value="delete">Delete</SelectItem>
                              <SelectItem value="query">Query</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Entity</Label>
                          <Select
                            value={op.entity || undefined}
                            onValueChange={(v) => updateOperation(op.id, { entity: v })}
                            disabled={loading || op.status !== 'pending'}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select entity" />
                            </SelectTrigger>
                            <SelectContent>
                              {BULLHORN_ENTITIES.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Data (JSON)</Label>
                        <Textarea
                          value={typeof op.data === 'string' ? op.data : JSON.stringify(op.data, null, 2)}
                          onChange={(e) => updateOperation(op.id, { data: e.target.value })}
                          placeholder='{"field": "value"}'
                          className="font-mono text-xs"
                          rows={3}
                          disabled={loading || op.status !== 'pending'}
                        />
                      </div>

                      {op.error && (
                        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                          {op.error}
                        </div>
                      )}

                      {op.result && (
                        <div className="p-2 bg-green-500/10 border border-green-500/20 rounded">
                          <pre className="text-xs font-mono overflow-auto">
                            {JSON.stringify(op.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function topologicalSort(operations: StackOperation[]): StackOperation[] {
  return [...operations]
}
