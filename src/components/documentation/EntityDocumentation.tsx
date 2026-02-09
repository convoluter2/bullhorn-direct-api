import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { EntitySidebar } from './EntitySidebar'
import { EntityDocViewer } from './EntityDocViewer'
import { entityMetadataService, type EntityMetadata } from '@/lib/entity-metadata'
import type { BullhornSession } from '@/lib/types'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Database, WarningCircle, ArrowsClockwise } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface EntityDocumentationProps {
  session: BullhornSession | null
}

interface CachedMetadata {
  metadata: EntityMetadata
  cachedAt: number
  corporationId: string
}

function generateCombinedHTMLDocumentation(entities: EntityMetadata[], session: BullhornSession | null): string {
  const restUrl = session?.restUrl || 'https://rest.bullhornstaffing.com/rest-services/{corpToken}'
  const token = session?.BhRestToken || '{BhRestToken}'
  
  const entitySections = entities.map(metadata => {
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

    return `
      <section id="${metadata.entity}" style="scroll-margin-top: 80px;">
        <h2>${metadata.label}</h2>
        <div>
          <span class="entity-name">${metadata.entity}</span>
          <span class="badge">${metadata.fields.length} fields</span>
        </div>
        
        <h3>Fields Reference</h3>
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

        <h3>API Examples</h3>
        <div style="display: grid; gap: 16px;">
          <div>
            <h4 style="font-size: 14px; margin-bottom: 8px; color: #374151;">Get Entity by ID</h4>
            <pre>GET ${restUrl}/entity/${metadata.entity}/{id}?fields=*&BhRestToken=${token}</pre>
          </div>
          <div>
            <h4 style="font-size: 14px; margin-bottom: 8px; color: #374151;">Search Entities</h4>
            <pre>GET ${restUrl}/search/${metadata.entity}?query=id:1&fields=*&BhRestToken=${token}</pre>
          </div>
          <div>
            <h4 style="font-size: 14px; margin-bottom: 8px; color: #374151;">Query Entities</h4>
            <pre>GET ${restUrl}/query/${metadata.entity}?where=id>0&fields=*&orderBy=id&count=10&BhRestToken=${token}</pre>
          </div>
        </div>
      </section>
    `
  }).join('')

  const tableOfContents = entities
    .map(e => `<li><a href="#${e.entity}" style="color: #3b82f6; text-decoration: none;">${e.label} (${e.entity})</a></li>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bullhorn API Documentation - All Entities</title>
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
    }
    
    .header {
      position: sticky;
      top: 0;
      background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
      color: white;
      padding: 24px 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 100;
    }
    
    .header h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 32px;
      font-weight: 700;
    }
    
    .header p {
      font-size: 14px;
      opacity: 0.9;
      margin-top: 4px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 40px 80px;
    }
    
    .toc {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 40px;
    }
    
    .toc h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 20px;
      margin-bottom: 16px;
      color: #111827;
    }
    
    .toc ul {
      list-style: none;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 8px;
    }
    
    .toc li {
      padding: 4px 0;
    }
    
    h1, h2, h3, h4 {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
    }
    
    h2 {
      font-size: 28px;
      margin-top: 60px;
      margin-bottom: 16px;
      color: #111827;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    
    h3 {
      font-size: 20px;
      margin-top: 32px;
      margin-bottom: 16px;
      color: #374151;
    }
    
    h4 {
      font-size: 14px;
      margin-bottom: 8px;
      color: #374151;
    }
    
    .entity-name {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
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
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      line-height: 1.5;
    }
    
    section {
      margin-bottom: 60px;
    }
    
    .footer {
      margin-top: 80px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Bullhorn API Documentation</h1>
    <p>${entities.length} Entities • Generated ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
  </div>
  
  <div class="container">
    <div class="toc">
      <h2>Table of Contents</h2>
      <ul>
        ${tableOfContents}
      </ul>
    </div>

    ${entitySections}

    <div class="footer">
      Generated by Bullhorn Data Manager • ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
    </div>
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

export function EntityDocumentation({ session }: EntityDocumentationProps) {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<EntityMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableEntities, setAvailableEntities] = useState<string[]>([])
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [metadataCache, setMetadataCache] = useKV<Record<string, CachedMetadata>>('entity-metadata-cache-v2', {})
  const [refreshingAll, setRefreshingAll] = useState(false)

  useEffect(() => {
    const loadAvailableEntities = async () => {
      if (!session) {
        setAvailableEntities([])
        return
      }

      setLoadingEntities(true)
      try {
        console.log('🔍 Loading all entities from /meta endpoint...')
        const entities = await bullhornAPI.getAllEntitiesMeta()
        
        console.log('📊 Raw entities response type:', typeof entities, 'isArray:', Array.isArray(entities))
        console.log('📊 Raw entities response length:', Array.isArray(entities) ? entities.length : 'N/A')
        console.log('📊 First 5 entities:', Array.isArray(entities) ? entities.slice(0, 5) : entities)
        
        if (!Array.isArray(entities)) {
          console.error('❌ getAllEntitiesMeta did not return an array, got:', typeof entities, entities)
          throw new Error('getAllEntitiesMeta did not return an array')
        }
        
        const entityNames = entities
          .filter(e => {
            const isValid = e && typeof e === 'object' && typeof e.entity === 'string'
            if (!isValid) {
              console.warn('⚠️ Invalid entity item:', e)
            }
            return isValid
          })
          .map(e => e.entity)
          .filter(name => {
            const isValid = name && name.length > 0
            if (!isValid) {
              console.warn('⚠️ Invalid entity name:', name)
            }
            return isValid
          })
        
        console.log(`✅ Extracted ${entityNames.length} entity names`)
        console.log(`📋 First 20 entity names:`, entityNames.slice(0, 20))
        console.log(`📋 Entity names data type check:`, entityNames.map(n => typeof n).slice(0, 5))
        
        if (entityNames.length === 0) {
          throw new Error('No valid entity names found in response')
        }
        
        const sortedEntityNames = [...entityNames].sort((a, b) => a.localeCompare(b))
        console.log(`📋 Setting ${sortedEntityNames.length} sorted entity names`)
        
        setAvailableEntities(sortedEntityNames)
        toast.success(`Loaded ${sortedEntityNames.length} entities from your tenant`)
      } catch (error) {
        console.error('❌ Failed to load entities:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        toast.error(`Failed to load entities: ${errorMessage}`)
        setAvailableEntities([])
      } finally {
        setLoadingEntities(false)
      }
    }

    loadAvailableEntities()
  }, [session])

  const loadMetadata = useCallback(async (entityName: string, forceRefresh = false, silent = false) => {
    if (!session) {
      if (!silent) {
        setError('Not connected to Bullhorn. Please authenticate first.')
      }
      return
    }

    if (!silent) {
      setLoading(true)
      setError(null)
    }

    try {
      const cacheKey = `${entityName}-${session.corporationId}`
      const cache = metadataCache || {}
      
      const cachedData = cache[cacheKey]
      if (!forceRefresh && cachedData && cachedData.corporationId === String(session.corporationId)) {
        if (!silent) {
          setMetadata(cachedData.metadata)
          setLoading(false)
        }
        return
      }

      const entityMetadata = await entityMetadataService.fetchMetadata(entityName, session, forceRefresh)
      
      if (!silent) {
        setMetadata(entityMetadata)
      }
      
      const cachedMetadata: CachedMetadata = {
        metadata: entityMetadata,
        cachedAt: Date.now(),
        corporationId: String(session.corporationId)
      }
      
      setMetadataCache((current) => ({
        ...(current || {}),
        [cacheKey]: cachedMetadata
      }))

      if (!silent) {
        toast.success(`Loaded metadata for ${entityMetadata.label}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load entity metadata'
      if (!silent) {
        setError(errorMessage)
        toast.error(errorMessage)
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [session, metadataCache, setMetadataCache])

  useEffect(() => {
    if (selectedEntity) {
      loadMetadata(selectedEntity)
    }
  }, [selectedEntity])

  const handleSelectEntity = (entityId: string) => {
    setSelectedEntity(entityId)
  }

  const handleRefresh = () => {
    if (selectedEntity) {
      loadMetadata(selectedEntity, true)
    }
  }

  const handleRefreshAll = async () => {
    if (!session) {
      toast.error('Not connected to Bullhorn')
      return
    }

    setRefreshingAll(true)
    try {
      const entitiesToRefresh = availableEntities
      toast.info(`Refreshing metadata for ${entitiesToRefresh.length} entities...`)
      
      let successCount = 0
      let failCount = 0
      
      for (const entityName of entitiesToRefresh) {
        try {
          const entityMetadata = await entityMetadataService.fetchMetadata(entityName, session, true)
          const cacheKey = `${entityName}-${session.corporationId}`
          const cachedMetadata: CachedMetadata = {
            metadata: entityMetadata,
            cachedAt: Date.now(),
            corporationId: String(session.corporationId)
          }
          
          setMetadataCache((current) => ({
            ...(current || {}),
            [cacheKey]: cachedMetadata
          }))
          
          successCount++
          
          if (successCount % 50 === 0) {
            toast.info(`Refreshed ${successCount}/${entitiesToRefresh.length} entities...`, { id: 'refresh-progress' })
          }
        } catch (err) {
          console.error(`Failed to refresh ${entityName}:`, err)
          failCount++
        }
      }
      
      toast.success(`Refreshed ${successCount} entities${failCount > 0 ? `, ${failCount} failed` : ''}`, { id: 'refresh-progress' })
    } catch (error) {
      toast.error('Failed to refresh metadata')
    } finally {
      setRefreshingAll(false)
    }
  }

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cached metadata? You will need to reload metadata for each entity you view.')) {
      setMetadataCache(() => ({}))
      toast.success('Metadata cache cleared')
    }
  }

  const handleExportAll = () => {
    if (Object.keys(metadataCache || {}).length === 0) {
      toast.error('No cached entities to export. Load some entities first.')
      return
    }

    try {
      const allEntities = Array.from(metadataMap.values())
      const html = generateCombinedHTMLDocumentation(allEntities, session)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bullhorn-entities-documentation.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Exported ${allEntities.length} entities to HTML`)
    } catch (err) {
      console.error('Failed to export all entities:', err)
      toast.error('Failed to export documentation')
    }
  }

  const metadataMap = new Map<string, EntityMetadata>()
  Object.entries(metadataCache || {}).forEach(([key, cachedData]) => {
    const entityName = key.split('-')[0]
    metadataMap.set(entityName, cachedData.metadata)
  })

  const cachedEntityCount = Object.keys(metadataCache || {}).length

  if (!session) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center space-y-4 max-w-md">
          <Database size={64} className="mx-auto text-muted-foreground opacity-50" />
          <div>
            <h3 className="text-lg font-semibold">Not Connected</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Please connect to Bullhorn to view entity documentation
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loadingEntities) {
    return (
      <div className="flex h-[calc(100vh-200px)] border border-border rounded-lg overflow-hidden bg-background">
        <div className="w-80 shrink-0 border-r border-border bg-card p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="space-y-2">
            {[...Array(15)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Database size={64} className="mx-auto text-accent animate-pulse" weight="duotone" />
            <div>
              <h3 className="text-lg font-semibold">Loading Entities</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Fetching all available entities from your tenant...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  console.log('📊 EntityDocumentation render - availableEntities:', {
    type: typeof availableEntities,
    isArray: Array.isArray(availableEntities),
    length: availableEntities?.length,
    first10: availableEntities?.slice(0, 10)
  })

  return (
    <div className="flex h-[calc(100vh-200px)] border border-border rounded-lg overflow-hidden bg-background">
      <div className="w-80 shrink-0">
        <EntitySidebar
          selectedEntity={selectedEntity}
          onSelectEntity={handleSelectEntity}
          customEntities={availableEntities}
          entityMetadata={metadataMap}
          onRefreshAll={handleRefreshAll}
          refreshingAll={refreshingAll}
          onClearCache={handleClearCache}
          cachedCount={cachedEntityCount}
          onExportAll={handleExportAll}
        />
      </div>
      <div className="flex-1">
        <EntityDocViewer
          entityName={selectedEntity || ''}
          metadata={metadata}
          loading={loading}
          error={error}
          session={session}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  )
}
