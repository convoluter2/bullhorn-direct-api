import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Database, Trash, Warning, CheckCircle, Broom, HardDrives } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface StorageItem {
  key: string
  type: 'logs' | 'session' | 'connection' | 'cache' | 'other'
  estimatedSize: string
  canDelete: boolean
}

export function DataStorageClearer() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [storageItems, setStorageItems] = useState<StorageItem[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [clearedItems, setClearedItems] = useState<string[]>([])

  const analyzeStorageItem = (key: string): StorageItem => {
    let type: StorageItem['type'] = 'other'
    let canDelete = true

    if (key === 'audit-logs') {
      type = 'logs'
    } else if (key === 'bullhorn-session') {
      type = 'session'
      canDelete = false
    } else if (key === 'current-connection-id') {
      type = 'connection'
      canDelete = false
    } else if (key.startsWith('credentials-') || key.startsWith('connection-')) {
      type = 'connection'
      canDelete = false
    } else if (key.includes('cache') || key.includes('entities') || key.includes('metadata')) {
      type = 'cache'
    }

    return {
      key,
      type,
      estimatedSize: 'Unknown',
      canDelete
    }
  }

  const loadStorageData = async () => {
    setLoading(true)
    try {
      const keys = await window.spark.kv.keys()
      const items = await Promise.all(
        keys.map(async (key) => {
          const item = analyzeStorageItem(key)
          try {
            const value = await window.spark.kv.get(key)
            const sizeEstimate = JSON.stringify(value).length
            const sizeMB = (sizeEstimate / 1024 / 1024).toFixed(2)
            const sizeKB = (sizeEstimate / 1024).toFixed(2)
            item.estimatedSize = sizeEstimate > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`
          } catch (error) {
            console.error(`Failed to get size for ${key}:`, error)
          }
          return item
        })
      )
      setStorageItems(items.sort((a, b) => a.key.localeCompare(b.key)))

      const deletableKeys = items.filter(i => i.canDelete && i.type === 'logs').map(i => i.key)
      setSelectedKeys(new Set(deletableKeys))
    } catch (error) {
      console.error('Failed to load storage data:', error)
      toast.error('Failed to load storage data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadStorageData()
    }
  }, [open])

  const toggleKey = (key: string) => {
    const newSelected = new Set(selectedKeys)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedKeys(newSelected)
  }

  const selectAllLogs = () => {
    const logKeys = storageItems.filter(i => i.type === 'logs' && i.canDelete).map(i => i.key)
    setSelectedKeys(new Set(logKeys))
  }

  const selectAllCache = () => {
    const cacheKeys = storageItems.filter(i => i.type === 'cache' && i.canDelete).map(i => i.key)
    setSelectedKeys(new Set(cacheKeys))
  }

  const selectAll = () => {
    const allKeys = storageItems.filter(i => i.canDelete).map(i => i.key)
    setSelectedKeys(new Set(allKeys))
  }

  const clearNone = () => {
    setSelectedKeys(new Set())
  }

  const clearSelectedData = async () => {
    if (selectedKeys.size === 0) {
      toast.warning('No items selected')
      return
    }

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedKeys.size} storage item(s)? This cannot be undone.`
    )

    if (!confirmed) return

    setLoading(true)
    const cleared: string[] = []

    try {
      for (const key of selectedKeys) {
        try {
          await window.spark.kv.delete(key)
          cleared.push(key)
          console.log(`✅ Deleted KV key: ${key}`)
        } catch (error) {
          console.error(`❌ Failed to delete ${key}:`, error)
          toast.error(`Failed to delete ${key}`)
        }
      }

      setClearedItems(cleared)
      toast.success(`Successfully deleted ${cleared.length} storage item(s)`)
      
      await loadStorageData()
      setSelectedKeys(new Set())
    } catch (error) {
      console.error('Clear operation failed:', error)
      toast.error('Failed to complete clear operation')
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: StorageItem['type']) => {
    switch (type) {
      case 'logs':
        return <Trash size={16} className="text-orange-500" />
      case 'session':
        return <CheckCircle size={16} className="text-green-500" />
      case 'connection':
        return <Database size={16} className="text-blue-500" />
      case 'cache':
        return <HardDrives size={16} className="text-purple-500" />
      default:
        return <Database size={16} className="text-muted-foreground" />
    }
  }

  const getTypeColor = (type: StorageItem['type']) => {
    switch (type) {
      case 'logs':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      case 'session':
        return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'connection':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'cache':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const logItems = storageItems.filter(i => i.type === 'logs')
  const cacheItems = storageItems.filter(i => i.type === 'cache')
  const sessionItems = storageItems.filter(i => i.type === 'session')
  const connectionItems = storageItems.filter(i => i.type === 'connection')
  const otherItems = storageItems.filter(i => i.type === 'other')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Broom />
          Clear Storage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database size={24} className="text-accent" />
            Clear Storage Data
          </DialogTitle>
          <DialogDescription>
            Free up Git LFS storage by removing old logs, cache, and other persisted data. Active sessions and connections are protected.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {loading && !storageItems.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading storage data...
            </div>
          ) : (
            <>
              {clearedItems.length > 0 && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    Successfully cleared {clearedItems.length} item(s): {clearedItems.slice(0, 3).join(', ')}
                    {clearedItems.length > 3 && ` and ${clearedItems.length - 3} more`}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={selectAllLogs}>
                  Select All Logs ({logItems.filter(i => i.canDelete).length})
                </Button>
                <Button size="sm" variant="outline" onClick={selectAllCache}>
                  Select All Cache ({cacheItems.filter(i => i.canDelete).length})
                </Button>
                <Button size="sm" variant="outline" onClick={selectAll}>
                  Select All Deletable ({storageItems.filter(i => i.canDelete).length})
                </Button>
                <Button size="sm" variant="ghost" onClick={clearNone}>
                  Clear Selection
                </Button>
              </div>

              <Separator />

              {logItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Trash size={18} className="text-orange-500" />
                    Audit Logs ({logItems.length})
                  </h3>
                  <div className="space-y-1">
                    {logItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => item.canDelete && toggleKey(item.key)}
                      >
                        <Checkbox
                          checked={selectedKeys.has(item.key)}
                          disabled={!item.canDelete}
                          onCheckedChange={() => item.canDelete && toggleKey(item.key)}
                        />
                        <div className="flex-1 flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <code className="text-sm font-mono">{item.key}</code>
                          <Badge variant="outline" className={getTypeColor(item.type)}>
                            {item.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cacheItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <HardDrives size={18} className="text-purple-500" />
                    Cache Data ({cacheItems.length})
                  </h3>
                  <div className="space-y-1">
                    {cacheItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => item.canDelete && toggleKey(item.key)}
                      >
                        <Checkbox
                          checked={selectedKeys.has(item.key)}
                          disabled={!item.canDelete}
                          onCheckedChange={() => item.canDelete && toggleKey(item.key)}
                        />
                        <div className="flex-1 flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <code className="text-sm font-mono">{item.key}</code>
                          <Badge variant="outline" className={getTypeColor(item.type)}>
                            {item.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sessionItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle size={18} className="text-green-500" />
                    Active Sessions ({sessionItems.length})
                  </h3>
                  <Alert className="border-green-500/50">
                    <Warning className="h-4 w-4 text-green-500" />
                    <AlertDescription>
                      Session data is protected and cannot be deleted here. Use the Disconnect button to clear your session.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-1">
                    {sessionItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-2 rounded-md bg-muted/30 opacity-50"
                      >
                        <Checkbox checked={false} disabled />
                        <div className="flex-1 flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <code className="text-sm font-mono">{item.key}</code>
                          <Badge variant="outline" className={getTypeColor(item.type)}>
                            {item.type} (protected)
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {connectionItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Database size={18} className="text-blue-500" />
                    Saved Connections ({connectionItems.length})
                  </h3>
                  <Alert className="border-blue-500/50">
                    <Warning className="h-4 w-4 text-blue-500" />
                    <AlertDescription>
                      Connection credentials are protected and cannot be deleted here. Use the Connection Manager to manage saved connections.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-1">
                    {connectionItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-2 rounded-md bg-muted/30 opacity-50"
                      >
                        <Checkbox checked={false} disabled />
                        <div className="flex-1 flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <code className="text-sm font-mono">{item.key}</code>
                          <Badge variant="outline" className={getTypeColor(item.type)}>
                            {item.type} (protected)
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {otherItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Database size={18} />
                    Other Data ({otherItems.length})
                  </h3>
                  <div className="space-y-1">
                    {otherItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => item.canDelete && toggleKey(item.key)}
                      >
                        <Checkbox
                          checked={selectedKeys.has(item.key)}
                          disabled={!item.canDelete}
                          onCheckedChange={() => item.canDelete && toggleKey(item.key)}
                        />
                        <div className="flex-1 flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <code className="text-sm font-mono">{item.key}</code>
                          <Badge variant="outline" className={getTypeColor(item.type)}>
                            {item.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {storageItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No storage data found
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={clearSelectedData}
            disabled={loading || selectedKeys.size === 0}
          >
            <Trash />
            Delete {selectedKeys.size} Item{selectedKeys.size !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
