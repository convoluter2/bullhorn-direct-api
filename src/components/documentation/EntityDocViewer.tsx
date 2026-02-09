import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, ArrowsClockwise, WarningCircle } from '@phosphor-icons/react'
import { FieldTable } from './FieldTable'
import { ApiExamples } from './ApiExamples'
import type { EntityMetadata } from '@/lib/entity-metadata'
import type { BullhornSession } from '@/lib/types'

interface EntityDocViewerProps {
  entityName: string
  metadata: EntityMetadata | null
  loading: boolean
  error: string | null
  session: BullhornSession | null
  onRefresh: () => void
}

export function EntityDocViewer({
  entityName,
  metadata,
  loading,
  error,
  session,
  onRefresh
}: EntityDocViewerProps) {
  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>
        <Separator />
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <WarningCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <ArrowsClockwise />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!metadata) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Database size={64} className="mx-auto text-muted-foreground opacity-50" />
          <div>
            <h3 className="text-lg font-semibold">No Entity Selected</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Select an entity from the sidebar to view its documentation
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Database size={32} className="text-accent" weight="duotone" />
                <h1 className="text-4xl font-bold tracking-tight">
                  {metadata.label}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-lg font-mono text-muted-foreground">
                  {metadata.entity}
                </code>
                <Badge variant="outline" className="font-mono text-xs">
                  {metadata.fields.length} fields
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <ArrowsClockwise />
              Refresh
            </Button>
          </div>

          {!session && (
            <Alert>
              <WarningCircle className="h-4 w-4" />
              <AlertDescription>
                Not connected to Bullhorn. API examples will use placeholder values.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            Fields Reference
          </h2>
          <p className="text-muted-foreground">
            Complete field definitions for the {metadata.label} entity. 
            Use these field names when constructing queries and updates.
          </p>
          <FieldTable fields={metadata.fields} />
        </div>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">API Examples</h2>
          <p className="text-muted-foreground">
            Ready-to-use code examples for common operations. 
            {session && ' These examples use your current session credentials.'}
          </p>
          <ApiExamples entityName={metadata.entity} session={session} />
        </div>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Field Type Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-card border border-border rounded-lg space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Field Types
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono shrink-0">
                    ID
                  </Badge>
                  <span className="text-muted-foreground">
                    Unique identifier field
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 font-mono shrink-0">
                    SCALAR
                  </Badge>
                  <span className="text-muted-foreground">
                    Simple value (string, number, boolean, date)
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono shrink-0">
                    TO_ONE
                  </Badge>
                  <span className="text-muted-foreground">
                    Single reference to another entity
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-400 border-orange-500/20 font-mono shrink-0">
                    TO_MANY
                  </Badge>
                  <span className="text-muted-foreground">
                    Multiple references to other entities
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-mono shrink-0">
                    COMPOSITE
                  </Badge>
                  <span className="text-muted-foreground">
                    Complex nested object
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-card border border-border rounded-lg space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                Data Types
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <code className="font-mono text-yellow-400 shrink-0">String</code>
                  <span className="text-muted-foreground">Text value</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-blue-400 shrink-0">Integer</code>
                  <span className="text-muted-foreground">Whole number</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-cyan-400 shrink-0">BigDecimal</code>
                  <span className="text-muted-foreground">Precise decimal number</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-green-400 shrink-0">Boolean</code>
                  <span className="text-muted-foreground">True/false value</span>
                </div>
                <div className="flex items-start gap-2">
                  <code className="font-mono text-purple-400 shrink-0">Timestamp</code>
                  <span className="text-muted-foreground">Date and time (epoch ms)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
