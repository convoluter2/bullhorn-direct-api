import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, Trash, Warning, CheckCircle, Broom, HardDrives } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface StorageItem {
  key: string
  type: 'logs' | 'session' | 'connection' | 'cache' | 'other'
  canDelete: boolean
  estimatedSize: string
}

export function DataStorageClearer() {
  const [open, setOpen] = useState(false)
  const [storageItems, setStorageItems] = useState<StorageItem[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [clearedItems, setClearedItems] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      loadStorageData()
  }, [open])
  }, [open])
lyzeStorageKey = (key: string): StorageItem => {
  const analyzeStorageKey = (key: string): StorageItem => {
    let canDelete = truetype'] = 'other'
    let type: StorageItem['type'] = 'other'
ey.includes('audit-log') || key.includes('-logs')) {
    if (key.includes('audit-log') || key.includes('-logs')) {
      type = 'logs' key === 'current-connection-id') {
    } else if (key.includes('bullhorn-session') || key === 'current-connection-id') {
      canDelete = false
      type = 'session'n') || key.includes('secure-credentials')) {
    } else if (key.includes('saved-connection') || key.includes('secure-credentials')) {
      canDelete = false
      type = 'connection'he') || key.includes('entity-metadata') || key.includes('field-cache')) {
    } else if (key.includes('cache') || key.includes('entity-metadata') || key.includes('field-cache')) {
      type = 'cache'
      key,
      type,
    return {
      key,matedSize: '~0 KB'
      type,
      canDelete,
      estimatedSize: '~0 KB'
    } () => {
  }
      setLoading(true)
  const loadStorageData = async () => {eys()
    try {st items = await Promise.all(
      setLoading(true)
      const keys = await window.spark.kv.keys()
      const items = await Promise.all(
        keys.map(async (key) => {
          const item = analyzeStorageKey(key)value).length
          try { 1024).toFixed(2)
            const value = await window.spark.kv.get(key)
            const sizeEstimate = JSON.stringify(value).length
            const sizeMB = (sizeEstimate / 1024).toFixed(2)
            item.estimatedSize = `~${sizeMB} KB`
          } catch (error) {
            console.error(`Failed to estimate size for ${key}:`, error)
          }
          return item
        })torageItems(items)
      )bleKeys = items.filter(i => i.canDelete).map(i => i.key)
(new Set(deletableKeys))
      setStorageItems(items)
      const deletableKeys = items.filter(i => i.canDelete).map(i => i.key)
      setSelectedKeys(new Set(deletableKeys))
    } catch (error) {
      console.error('Failed to load storage data:', error)
      toast.error('Failed to load storage data')
    } finally {
  const toggleKey = (key: string, canDelete: boolean) => {
    }

 new Set(selectedKeys)
  const toggleKey = (key: string, canDelete: boolean) => {
    if (!canDelete) return
    } else {
    const newSelected = new Set(selectedKeys)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }st selectAll = () => {
    setSelectedKeys(newSelected)ey)
  const selectAllLogs = () => {
t(storageItems.filter(i => i.type === 'logs' && i.canDelete).map(i => i.key)))
  const selectAll = () => {
    const allKeys = storageItems.filter(i => i.canDelete).map(i => i.key)
    setSelectedKeys(new Set(allKeys))
  } setSelectedKeys(new Set(storageItems.filter(i => i.type === 'cache' && i.canDelete).map(i => i.key)))

  const selectAllLogs = () => {
    setSelectedKeys(new Set(storageItems.filter(i => i.type === 'logs' && i.canDelete).map(i => i.key)))
  }tSelectedKeys(new Set())
  }
  const selectAllCache = () => {
    setSelectedKeys(new Set(storageItems.filter(i => i.type === 'cache' && i.canDelete).map(i => i.key)))
  } if (selectedKeys.size === 0) {
   toast.warning('No items selected')
  const clearNone = () => {
    setSelectedKeys(new Set())
  }

  const clearSelected = async () => {{selectedKeys.size} storage item(s)? This cannot be undone.`
    if (selectedKeys.size === 0) {
      toast.warning('No items selected')
      return
    }oading(true)
    const cleared: string[] = []
    const confirmed = confirm(
      `Are you sure you want to delete ${selectedKeys.size} storage item(s)? This cannot be undone.`
    )
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
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedKeys.has(item.key)}
                          onCheckedChange={() => toggleKey(item.key, item.canDelete)}
                          disabled={!item.canDelete}
                        />
                        <div className="flex-1 flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <code className="text-sm font-mono">{item.key}</code>
                          <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                        </div>
                      </div>
                    ))}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
              )}
                        <Checkbox
                          checked={selectedKeys.has(item.key)}
                          onCheckedChange={() => toggleKey(item.key, item.canDelete)}
                          disabled={!item.canDelete}
                        />"text-purple-500" />
                        <div className="flex-1 flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <code className="text-sm font-mono">{item.key}</code>
                          <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                        </div>
                      </div>
                    ))} items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                  </div>
                </div>  <Checkbox
              )}ctedKeys.has(item.key)}
       onCheckedChange={() => toggleKey(item.key, item.canDelete)}
              {cacheItems.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <HardDrives size={18} className="text-purple-500" />
                    Cache ({cacheItems.length})ey}</code>
                  </h3><span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                  <div className="space-y-1">
                    {cacheItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedKeys.has(item.key)}
                          onCheckedChange={() => toggleKey(item.key, item.canDelete)}
                          disabled={!item.canDelete}items-center gap-2">
                        />Circle size={18} className="text-green-500" />
                        <div className="flex-1 flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <code className="text-sm font-mono">{item.key}</code>
                          <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                        </div>
                      </div>{item.key}
                    ))} className="flex items-center gap-3 p-2 rounded-md bg-green-500/5 opacity-50"
                  </div>
                </div>  <Checkbox
              )}          checked={false}
                          disabled={true}
              {sessionItems.length > 0 && (
                <div className="space-y-2">x-1 flex items-center gap-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle size={18} className="text-green-500" /></code>
                    Sessions ({sessionItems.length}) - Protectedreground ml-auto">{item.estimatedSize}</span>
                  </h3> </div>
                  <div className="space-y-1">
                    {sessionItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-2 rounded-md bg-green-500/5 opacity-50"
                      >
                        <Checkboxngth > 0 && (
                          checked={false}">
                          disabled={true}ibold flex items-center gap-2">
                        />ase size={18} className="text-blue-500" />
                        <div className="flex-1 flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <code className="text-sm font-mono">{item.key}</code>
                          <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                        </div>
                      </div>{item.key}
                    ))} className="flex items-center gap-3 p-2 rounded-md bg-blue-500/5 opacity-50"
                  </div>
                </div>  <Checkbox
              )}          checked={false}
                          disabled={true}
              {connectionItems.length > 0 && (
                <div className="space-y-2">x-1 flex items-center gap-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Database size={18} className="text-blue-500" />key}</code>
                    Connections ({connectionItems.length}) - Protectednd ml-auto">{item.estimatedSize}</span>
                  </h3> </div>
                  <div className="space-y-1">
                    {connectionItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-2 rounded-md bg-blue-500/5 opacity-50"
                      >
                        <Checkbox> 0 && (
                          checked={false}">
                          disabled={true}ibold flex items-center gap-2">
                        />ase size={18} className="text-muted-foreground" />
                        <div className="flex-1 flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <code className="text-sm font-mono">{item.key}</code>
                          <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                        </div>
                      </div>{item.key}
                    ))} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                  </div>
                </div>  <Checkbox
              )}          checked={selectedKeys.has(item.key)}
                          onCheckedChange={() => toggleKey(item.key, item.canDelete)}
              {otherItems.length > 0 && (.canDelete}
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Database size={18} className="text-muted-foreground" />
                    Other ({otherItems.length})-sm font-mono">{item.key}</code>
                  </h3>   <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                  <div className="space-y-1">
                    {otherItems.map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={selectedKeys.has(item.key)}
                          onCheckedChange={() => toggleKey(item.key, item.canDelete)}
                          disabled={!item.canDelete}
                        />
                        <div className="flex-1 flex items-center gap-2">
                          {getTypeIcon(item.type)}
                          <code className="text-sm font-mono">{item.key}</code>
                          <span className="text-xs text-muted-foreground ml-auto">{item.estimatedSize}</span>
                        </div>
                      </div>
                    ))}
                  </div>flex items-center justify-between">
                </div>me="text-sm text-muted-foreground">
              )}ectedKeys.size} of {storageItems.filter(i => i.canDelete).length} deletable items selected
          </div>
              {storageItems.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No storage data found
                </div>
              )}ton 
            </>ariant="destructive" 
          )}  onClick={clearSelected}
        </div>disabled={selectedKeys.size === 0 || loading}
            >
        <Separator />/>
              Delete Selected
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedKeys.size} of {storageItems.filter(i => i.canDelete).length} deletable items selected
          </div>ntent>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>            <Button               variant="destructive"               onClick={clearSelected}              disabled={selectedKeys.size === 0 || loading}            >              <Trash />              Delete Selected            </Button>          </div>        </div>      </DialogContent>    </Dialog>  )}