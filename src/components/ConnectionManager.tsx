import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ShieldCheck, Plus, Pencil, Trash } from '@phosphor-icons/react'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
import type { SavedConnection, SecureCredentials } from '@/lib/secure-credentials'

interface ConnectionManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connections: SavedConnection[]
  onSaveConnection: (connection: SavedConnection, credentials: SecureCredentials) => Promise<void>
  onDeleteConnection: (id: string) => Promise<void>
  onSelectConnection: (connection: SavedConnection) => Promise<void>
  onUpdateConnection: (id: string, updates: Partial<SavedConnection>, credentials?: SecureCredentials) => Promise<void>
  embedded?: boolean
}

export function ConnectionManager({
  open,
  onOpenChange,
  connections,
  onSaveConnection,
  onDeleteConnection,
  onSelectConnection,
  onUpdateConnection,
  embedded = false
}: ConnectionManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    tenant: '',
    environment: 'NPE' as 'NPE' | 'PROD',
    clientId: '',
    clientSecret: '',
    username: '',
    password: ''
  })

  const resetForm = () => {
    setFormData({
      name: '',
      tenant: '',
      environment: 'NPE',
      clientId: '',
      clientSecret: '',
      username: '',
      password: ''
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.tenant || !formData.clientId || !formData.clientSecret || !formData.username || !formData.password) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      console.log('💾 ConnectionManager - handleSave called:', {
        name: formData.name,
        tenant: formData.tenant,
        environment: formData.environment,
        hasClientId: !!formData.clientId,
        hasUsername: !!formData.username,
        editingId
      })

      const credentials: SecureCredentials = {
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
        username: formData.username,
        password: formData.password
      }

      if (editingId) {
        const connection: Partial<SavedConnection> = {
          name: formData.name,
          tenant: formData.tenant,
          environment: formData.environment
        }
        console.log('📝 ConnectionManager - Updating connection:', editingId)
        await onUpdateConnection(editingId, connection, credentials)
        toast.success(`Connection "${formData.name}" updated`)
      } else {
        console.log('➕ ConnectionManager - Creating new connection')
        const connectionId = `conn-${Date.now()}`
        const connection: SavedConnection = {
          id: connectionId,
          name: formData.name,
          tenant: formData.tenant,
          environment: formData.environment,
          createdAt: Date.now()
        }
        await onSaveConnection(connection, credentials)
        toast.success(`Connection "${formData.name}" saved`)
      }

      resetForm()
    } catch (error) {
      console.error('❌ ConnectionManager - Save failed:', error)
      toast.error('Failed to save connection')
    }
  }

  const handleEdit = async (connection: SavedConnection) => {
    console.log('✏️ ConnectionManager - Edit clicked for:', connection.id)
    const credentials = await secureCredentialsAPI.getCredentials(connection.id)
    
    setFormData({
      name: connection.name,
      tenant: connection.tenant,
      environment: connection.environment,
      clientId: credentials?.clientId || '',
      clientSecret: credentials?.clientSecret || '',
      username: credentials?.username || '',
      password: credentials?.password || ''
    })
    setEditingId(connection.id)
    setShowAddForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this connection? This will also delete the stored credentials.')) {
      onDeleteConnection(id)
    }
  }

  const handleUse = async (connection: SavedConnection) => {
    console.log('🔌 ConnectionManager - Use clicked:', {
      id: connection.id,
      name: connection.name,
      environment: connection.environment,
      tenant: connection.tenant
    })
    
    const credentials = await secureCredentialsAPI.getCredentials(connection.id)
    console.log('🔑 ConnectionManager - Retrieved credentials for use:', {
      hasCredentials: !!credentials,
      hasClientId: !!credentials?.clientId,
      hasUsername: !!credentials?.username
    })
    
    if (!credentials) {
      toast.error('Credentials not found for this connection')
      return
    }
    
    console.log('✅ ConnectionManager - Calling onSelectConnection')
    await onSelectConnection(connection)
    
    if (!embedded) {
      onOpenChange(false)
    }
  }

  const content = (
    <div className="space-y-6">
      <Alert>
        <ShieldCheck className="h-4 w-4 text-accent" />
        <AlertDescription>
          <strong>Secure Storage:</strong> Your credentials are encrypted and stored securely using Spark's KV storage.
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
              Enter your Bullhorn API credentials
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
                  placeholder="e.g., Trustaff Production"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conn-environment">Environment</Label>
                <Select value={formData.environment} onValueChange={(value: 'NPE' | 'PROD') => setFormData({ ...formData, environment: value })}>
                  <SelectTrigger id="conn-environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NPE">NPE</SelectItem>
                    <SelectItem value="PROD">PROD</SelectItem>
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
                  <SelectItem value="Fastaff">Fastaff</SelectItem>
                  <SelectItem value="VistaVital">VistaVital</SelectItem>
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
                placeholder="Your OAuth Client ID"
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
                placeholder="Bullhorn username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conn-password">Password</Label>
              <Input
                id="conn-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Bullhorn password"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} className="flex-1">
                {editingId ? 'Update Connection' : 'Save Connection'}
              </Button>
              <Button onClick={resetForm} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <Label className="text-sm font-semibold">Saved Connections ({connections.length})</Label>
        <div className="space-y-2">
          {connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No saved connections yet</p>
            </div>
          ) : (
            connections
              .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
              .map((conn) => (
                <Card key={conn.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{conn.name}</h4>
                          <Badge variant={conn.environment === 'PROD' ? 'default' : 'secondary'} className="text-xs">
                            {conn.environment}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{conn.tenant}</span>
                          {conn.lastUsed && (
                            <>
                              <span>•</span>
                              <p className="text-xs">
                                Last used: {new Date(conn.lastUsed).toLocaleDateString()}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleUse(conn)}
                        >
                          Use
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(conn)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(conn.id)}
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
      </div>
    </div>
  )

  if (embedded) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <ShieldCheck size={28} className="text-accent" />
            Saved Connections
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage your Bullhorn API connections securely
          </p>
        </div>
        {content}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={24} className="text-accent" />
            Manage Connections
          </DialogTitle>
          <DialogDescription>
            Save and manage multiple Bullhorn API connections
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}

export type { SavedConnection, SecureCredentials }
