import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash, PencilSimple, Check, X, Database, Info } from '@phosphor-icons/react'
import { toast } from 'sonner'

export interface SavedConnection {
  id: string
  name: string
  clientId: string
  clientSecret: string
  username: string
  password: string
  createdAt: number
  lastUsed?: number
}

interface ConnectionManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connections: SavedConnection[]
  onSaveConnection: (connection: Omit<SavedConnection, 'id' | 'createdAt'>) => void
  onDeleteConnection: (id: string) => void
  onSelectConnection: (connection: SavedConnection) => void
  onUpdateConnection: (id: string, connection: Partial<SavedConnection>) => void
}

export function ConnectionManager({
  open,
  onOpenChange,
  connections,
  onSaveConnection,
  onDeleteConnection,
  onSelectConnection,
  onUpdateConnection
}: ConnectionManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    clientSecret: '',
    username: '',
    password: ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      clientId: '',
      clientSecret: '',
      username: '',
      password: ''
    })
    setShowAddForm(false)
    setEditingId(null)
  }

  const handleSave = () => {
    if (!formData.name || !formData.clientId || !formData.clientSecret || !formData.username || !formData.password) {
      toast.error('All fields are required')
      return
    }

    if (editingId) {
      onUpdateConnection(editingId, formData)
      toast.success('Connection updated successfully')
    } else {
      onSaveConnection(formData)
      toast.success('Connection saved successfully')
    }
    
    resetForm()
  }

  const handleEdit = (connection: SavedConnection) => {
    setFormData({
      name: connection.name,
      clientId: connection.clientId,
      clientSecret: connection.clientSecret,
      username: connection.username,
      password: connection.password
    })
    setEditingId(connection.id)
    setShowAddForm(true)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      onDeleteConnection(id)
      toast.success('Connection deleted')
    }
  }

  const handleSelect = (connection: SavedConnection) => {
    onSelectConnection(connection)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Saved Connections</DialogTitle>
          <DialogDescription>
            Manage your Bullhorn OAuth connection profiles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Save your connection credentials for quick access. Your credentials are stored locally in your browser.
            </AlertDescription>
          </Alert>

          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus />
              Add New Connection
            </Button>
          )}

          {showAddForm && (
            <Card className="border-accent/50">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingId ? 'Edit Connection' : 'New Connection'}
                </CardTitle>
                <CardDescription>
                  Enter your Bullhorn OAuth credentials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="conn-name">Connection Name</Label>
                  <Input
                    id="conn-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Production, Sandbox, Testing, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conn-clientId">Client ID</Label>
                  <Input
                    id="conn-clientId"
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    placeholder="a6a33789-1490-4888-994e-345f22808e41"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conn-clientSecret">Client Secret</Label>
                  <Input
                    id="conn-clientSecret"
                    type="password"
                    value={formData.clientSecret}
                    onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                    placeholder="Your OAuth Client Secret"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conn-username">Username</Label>
                  <Input
                    id="conn-username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="your.email@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conn-password">Password</Label>
                  <Input
                    id="conn-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Your Bullhorn password"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">
                    <Check />
                    {editingId ? 'Update' : 'Save'}
                  </Button>
                  <Button onClick={resetForm} variant="outline">
                    <X />
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Saved Connections ({connections.length})</Label>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {connections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No saved connections</p>
                    <p className="text-xs">Add a connection to get started</p>
                  </div>
                ) : (
                  connections.map((conn) => (
                    <Card key={conn.id} className="hover:border-accent/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold truncate">{conn.name}</h4>
                              {conn.lastUsed && (
                                <Badge variant="secondary" className="text-xs">
                                  Last used
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p className="truncate">
                                <span className="font-medium">Username:</span> {conn.username}
                              </p>
                              <p className="truncate font-mono">
                                <span className="font-medium">Client ID:</span> {conn.clientId.substring(0, 20)}...
                              </p>
                              <p className="text-xs">
                                Created: {new Date(conn.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSelect(conn)}
                            >
                              <Database />
                              Use
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(conn)}
                            >
                              <PencilSimple />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(conn.id, conn.name)}
                            >
                              <Trash />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
