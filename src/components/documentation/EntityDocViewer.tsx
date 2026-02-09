import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, ArrowsClockwise, WarningCircle, Export } from '@phosphor-icons/react'
import { FieldTable } from './FieldTable'
import { ApiExamples } from './ApiExamples'
import { toast } from 'sonner'
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

function generateHTMLDocumentation(metadata: EntityMetadata, session: BullhornSession | null): string {
  const restUrl = session?.restUrl || 'https://rest.bullhornstaffing.com/rest-services/{corpToken}'
  const token = session?.BhRestToken || '{BhRestToken}'
  
  const fieldsHTML = metadata.fields
    .map(field => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 13px;">${field.name}</code>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${field.label || field.name}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <span style="display: inline-block; padding: 2px 8px; background: ${getFieldTypeBadgeColor(field.type)}; color: white; border-radius: 4px; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace;">
            ${field.type}
          </span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <code style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #6b7280;">${field.dataType}</code>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${field.required ? '' : '✓'}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          ${field.readonly ? '✓' : ''}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${field.associatedEntity?.entity || '-'}
        </td>
      </tr>
    `)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metadata.label} - Bullhorn API Documentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    h1, h2, h3 {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
    }
    
    h1 {
      font-size: 36px;
      margin-bottom: 12px;
      color: #111827;
    }
    
    h2 {
      font-size: 28px;
      margin-top: 48px;
      margin-bottom: 16px;
      color: #111827;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    
    h3 {
      font-size: 18px;
      margin-top: 24px;
      margin-bottom: 12px;
      color: #374151;
    }
    
    .entity-name {
      font-family: 'JetBrains Mono', monospace;
      font-size: 20px;
      color: #6b7280;
      font-weight: 400;
    }
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 500;
      margin-left: 12px;
    }
    
    .alert {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
      color: #78350f;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    
    thead {
      background: #f9fafb;
    }
    
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #f3f4f6;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    tr:hover {
      background: #f9fafb;
    }
    
    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
    }
    
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 16px 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .description {
      font-size: 15px;
      color: #6b7280;
      margin-bottom: 24px;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin: 24px 0;
    }
    
    .card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }
    
    .card-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      margin-bottom: 16px;
    }
    
    .type-item {
      display: flex;
      align-items: start;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 14px;
    }
    
    .type-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 600;
      min-width: 80px;
      text-align: center;
      flex-shrink: 0;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${metadata.label}</h1>
      <div>
        <span class="entity-name">${metadata.entity}</span>
        <span class="badge">${metadata.fields.length} fields</span>
      </div>
    </header>

    ${!session ? '<div class="alert">⚠️ API examples use placeholder values. Connect to Bullhorn for personalized examples.</div>' : ''}

    <section>
      <h2>Fields Reference</h2>
      <p class="description">
        Complete field definitions for the ${metadata.label} entity. 
        Use these field names when constructing queries and updates.
      </p>
      
      <table>
        <thead>
          <tr>
            <th>Field Name</th>
            <th>Label</th>
            <th>Type</th>
            <th>Data Type</th>
            <th>Optional</th>
            <th>Read-Only</th>
            <th>Associated Entity</th>
          </tr>
        </thead>
        <tbody>
          ${fieldsHTML}
        </tbody>
      </table>
    </section>

    <section>
      <h2>API Examples</h2>
      <p class="description">
        Ready-to-use code examples for common operations.
      </p>

      <h3>Get Entity by ID</h3>
      <pre>GET ${restUrl}/entity/${metadata.entity}/{id}?fields=*&BhRestToken=${token}</pre>

      <h3>Search Entities</h3>
      <pre>GET ${restUrl}/search/${metadata.entity}?query=id:1&fields=*&BhRestToken=${token}</pre>

      <h3>Query Entities</h3>
      <pre>GET ${restUrl}/query/${metadata.entity}?where=id>0&fields=*&orderBy=id&count=10&BhRestToken=${token}</pre>

      <h3>Create Entity</h3>
      <pre>POST ${restUrl}/entity/${metadata.entity}?BhRestToken=${token}
Content-Type: application/json

{
  "field1": "value1",
  "field2": "value2"
}</pre>

      <h3>Update Entity</h3>
      <pre>POST ${restUrl}/entity/${metadata.entity}/{id}?BhRestToken=${token}
Content-Type: application/json

{
  "field1": "newValue1"
}</pre>

      <h3>Delete Entity</h3>
      <pre>DELETE ${restUrl}/entity/${metadata.entity}/{id}?BhRestToken=${token}</pre>
    </section>

    <section>
      <h2>Field Type Reference</h2>
      <div class="grid">
        <div class="card">
          <div class="card-title">Field Types</div>
          <div class="type-item">
            <span class="type-badge" style="background: #3b82f6; color: white;">ID</span>
            <span style="color: #6b7280;">Unique identifier field</span>
          </div>
          <div class="type-item">
            <span class="type-badge" style="background: #10b981; color: white;">SCALAR</span>
            <span style="color: #6b7280;">Simple value (string, number, boolean, date)</span>
          </div>
          <div class="type-item">
            <span class="type-badge" style="background: #8b5cf6; color: white;">TO_ONE</span>
            <span style="color: #6b7280;">Single reference to another entity</span>
          </div>
          <div class="type-item">
            <span class="type-badge" style="background: #f97316; color: white;">TO_MANY</span>
            <span style="color: #6b7280;">Multiple references to other entities</span>
          </div>
          <div class="type-item">
            <span class="type-badge" style="background: #06b6d4; color: white;">COMPOSITE</span>
            <span style="color: #6b7280;">Complex nested object</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Data Types</div>
          <div class="type-item">
            <code style="color: #eab308;">String</code>
            <span style="color: #6b7280;">Text value</span>
          </div>
          <div class="type-item">
            <code style="color: #3b82f6;">Integer</code>
            <span style="color: #6b7280;">Whole number</span>
          </div>
          <div class="type-item">
            <code style="color: #06b6d4;">BigDecimal</code>
            <span style="color: #6b7280;">Precise decimal number</span>
          </div>
          <div class="type-item">
            <code style="color: #10b981;">Boolean</code>
            <span style="color: #6b7280;">True/false value</span>
          </div>
          <div class="type-item">
            <code style="color: #8b5cf6;">Timestamp</code>
            <span style="color: #6b7280;">Date and time (epoch ms)</span>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer">
      Generated by Bullhorn Data Manager • ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
    </footer>
  </div>
</body>
</html>`
}

function getFieldTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    'ID': '#3b82f6',
    'SCALAR': '#10b981',
    'TO_ONE': '#8b5cf6',
    'TO_MANY': '#f97316',
    'COMPOSITE': '#06b6d4'
  }
  return colors[type] || '#6b7280'
}

export function EntityDocViewer({
  entityName,
  metadata,
  loading,
  error,
  session,
  onRefresh
}: EntityDocViewerProps) {
  const exportToHTML = () => {
    if (!metadata) {
      toast.error('No metadata to export')
      return
    }

    try {
      const html = generateHTMLDocumentation(metadata, session)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${metadata.entity}-documentation.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported ${metadata.entity} documentation to HTML`)
    } catch (err) {
      console.error('Failed to export HTML:', err)
      toast.error('Failed to export documentation')
    }
  }

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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportToHTML}>
                <Export />
                Export HTML
              </Button>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <ArrowsClockwise />
                Refresh
              </Button>
            </div>
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
