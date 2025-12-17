import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash, PencilSimple, Check, X, Database, ShieldCheck } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { secureCredentialsAPI, type SavedConnection, type SecureCredentials } from '@/lib/secure-credentials'

interface ConnectionManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connections: SavedConnection[]
  onSaveConnection: (connection: SavedConnection, credentials: SecureCredentials) => void
  onDeleteConnection: (id: string) => void
  onSelectConnection: (connection: SavedConnection) => void
  onUpdateConnection: (id: string, connection: Partial<SavedConnection>, credentials?: SecureCredentials) => void
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
    environment: 'PROD' as 'NPE' | 'PROD',
    tenant: '',
    clientId: '',
    clientSecret: '',
    username: '',
    password: ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      environment: 'PROD',
      tenant: '',
      clientId: '',
      clientSecret: '',
      username: '',
      password: ''
    })
    setShowAddForm(false)
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.tenant || !formData.clientId || !formData.clientSecret || !formData.username || !formData.password) {
      toast.error('All fields are required')
      return
    }

    const credentials: SecureCredentials = {
      clientId: formData.clientId,
      clientSecret: formData.clientSecret,
      username: formData.username,
      password: formData.password
    }

    if (editingId) {
      const connection: Partial<SavedConnection> = {
        name: formData.name,
        environment: formData.environment,
        tenant: formData.tenant
      }
      onUpdateConnection(editingId, connection, credentials)
      toast.success('Connection updated successfully')
    } else {
      const connection: SavedConnection = {
        id: `conn-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: formData.name,
        environment: formData.environment,
        tenant: formData.tenant,
        createdAt: Date.now()
      }
      onSaveConnection(connection, credentials)
      toast.success('Connection saved securely')
    }
    
    resetForm()
  }

  const handleEdit = async (connection: SavedConnection) => {
    const credentials = await secureCredentialsAPI.getCredentials(connection.id)
    
    setFormData({
      name: connection.name,
      environment: connection.environment,
      tenant: connection.tenant,
      clientId: credentials?.clientId || '',
      clientSecret: credentials?.clientSecret || '',
      username: credentials?.username || '',
      password: credentials?.password || ''
    })
    setEditingId(connection.id)
    setShowAddForm(true)
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This will permanently delete the stored credentials.`)) {
      onDeleteConnection(id)
      toast.success('Connection and credentials deleted securely')
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
          <DialogTitle className="text-2xl flex items-center gap-2">
            <ShieldCheck className="text-accent" />
            Saved Connections
          </DialogTitle>
          <DialogDescription>
            Manage your Bullhorn OAuth connection profiles with secure server-side credential storage
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-accent/30 bg-accent/5">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <AlertDescription className="text-xs">
              <strong>Secure Storage:</strong> Your credentials are encrypted and stored securely on the server, not in your browser.
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="conn-name">Connection Name</Label>
                    <Input
                      id="conn-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Production, Sandbox, etc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="conn-environment">Environment</Label>
                    <Select value={formData.environment} onValueChange={(value: 'NPE' | 'PROD') => setFormData({ ...formData, environment: value })}>
                      <SelectTrigger id="conn-environment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NPE">NPE (Non-Production)</SelectItem>
                        <SelectItem value="PROD">PROD (Production)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="conn-tenant">Tenant</Label>
                  <Select value={formData.tenant} onValueChange={(value) => setFormData({ ...formData, tenant: value })}>
                    <SelectTrigger id="conn-tenant">
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Trustaff/Ingenovis">Trustaff/Ingenovis</SelectItem>
                      <SelectItem value="Fastaff/USN">Fastaff/USN</SelectItem>
                      <SelectItem value="Springboard">Springboard</SelectItem>
                      <SelectItem value="Vista/Vital">Vista/Vital</SelectItem>
                      <SelectItem value="HCS">HCS</SelectItem>
                    </SelectContent>
                  </Select>
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
                    {editingId ? 'Update' : 'Save Securely'}
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
                  connections
                    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
                    .map((conn) => (
                      <Card key={conn.id} className="hover:border-accent/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold truncate">{conn.name}</h4>
                                <Badge variant={conn.environment === 'PROD' ? 'default' : 'secondary'} className="text-xs">
                                  {conn.environment}
                                </Badge>
                                {conn.lastUsed && (
                                  <Badge variant="outline" className="text-xs">
                                    Last used
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p className="truncate">
                                  <span className="font-medium">Tenant:</span> {conn.tenant}
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

export type { SavedConnection, SecureCredentials }
