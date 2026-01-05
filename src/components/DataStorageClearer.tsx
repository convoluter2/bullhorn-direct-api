import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, Dia
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Database, Trash, Warning, CheckCircle, Broom

  key: string
  estimatedSize: string
}
export function DataStorageCle

  const [selectedKeys, 

    let type: StorageItem['type'] = 'other'

      type = 'logs'
 

      canDelete = false
      type = 'connection'
    } else if (key.includes('cache') || key.inc
    }
    return {
      type,

  }
  const loadStorageData = async () => {
    try {

          const item = analyzeS
            const v
            const sizeMB = (sizeEstimate / 1
            item.estim
            console.err
          return item
      )

      setSelectedKeys(new Set(deletableKeys))
      console.error('Fail
    } finally {
    }

    i


    const 
      newSe
      newSelected.add(key)
    setSelected

   

  const selectAllCache = () => {
    setSelectedKeys(

    const allKeys = storageItems.filter(i => i.
  }
  const clearNone = () => {
  }
  const clearSe
      toast.warning('No items selected')
    }
    const confirmed = confirm(
    )
    if (!confirmed) return
    setLoading(true)

      for (
          await windo
          
       
        }

      toast.success(`Successfully deleted ${cleared.length} storage item(s)`)
      await loadStorageData()
    } catch (error) {
      toast.error('Failed to complete clear operation')
      setLoading(false)
  }
  const getTypeIcon = (
     
   

      case 'cache':
      default:
    }

    switch (

        return 'bg-green-500/10 text-g
        return 'bg-blue-500/10 text-blue-600 
        return 'bg-purple-500/1
        return 'bg-muted text
  }
  const logItems = storage
  con
  const otherItems = storageItem
  r

          <Broom />
        </Button>
      <DialogContent className="max-w
   

          <DialogDescription>
          </DialogDescription>

   

          ) : (
              {clearedItems.length > 0 && (
                  <CheckCircle classN
   

              )}
              <div className="
   

                </Button>
                  Select All Delet
                <Button size="sm" varian
            


                <div className
                    <Trash size={18} className="text-orange-500" />
     

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
                      <div
                        className="flex items-center gap-3 p-2 rounded-md hov
                      >
                          checked
                          onCheckedChange={() => item.canDelet
                        <div className="flex-1 flex 
                          <code className="text-sm font-mono">{item.key}</code>
                          
                          <span className="text-xs text-muted-foreground
                      </div>
                  </div>
              )}
              {storageItems.length === 
                  No storage data 
              )}
          )}

          <Button varia
          </Button>
            variant="d
            disa

          </Button>
      </DialogContent>
  )

























































































































































