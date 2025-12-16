import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Database, MagnifyingGlass, Upload, Stack, ClockCounterClockwise, SignOut, ChartLineUp, Faders, Swap } from '@phosphor-icons/react'
import { AuthDialog } from '@/components/AuthDialog'
import { OAuthCallback } from '@/components/OAuthCallback'
import { QueryBlast } from '@/components/QueryBlast'
import { CSVLoader } from '@/components/CSVLoader'
import { SmartStack } from '@/components/SmartStack'
import { QueryStack } from '@/components/QueryStack'
import { AuditLogs } from '@/components/AuditLogs'
import { ConnectionManager, type SavedConnection } from '@/components/ConnectionManager'
import { ConnectionSwitcher } from '@/components/ConnectionSwitcher'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'
import type { BullhornSession, AuditLog } from '@/lib/types'

function App() {
  const [session, setSession] = useKV<BullhornSession | null>('bullhorn-session', null)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [connectionManagerOpen, setConnectionManagerOpen] = useState(false)
  const [logs, setLogs] = useKV<AuditLog[]>('audit-logs', [])
  const [activeTab, setActiveTab] = useState('queryblast')
  const [credentials, setCredentials] = useKV<{ clientId: string; clientSecret: string } | null>('bullhorn-credentials', null)
  const [savedConnections, setSavedConnections] = useKV<SavedConnection[]>('saved-connections', [])
  const [isOAuthCallback, setIsOAuthCallback] = useState(false)
  const [currentConnectionId, setCurrentConnectionId] = useKV<string | null>('current-connection-id', null)
  const [preselectedConnection, setPreselectedConnection] = useState<SavedConnection | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const errorParam = urlParams.get('error')
    
    if (code || errorParam) {
      setIsOAuthCallback(true)
    }
  }, [])

  useEffect(() => {
    if (!session || !session.refreshToken || !session.expiresAt || !credentials) {
      return
    }

    const checkTokenExpiry = async () => {
      const now = Date.now()
      const timeUntilExpiry = session.expiresAt! - now

      if (timeUntilExpiry < 60000) {
        try {
          const tokenData = await bullhornAPI.refreshAccessToken(
            session.refreshToken!,
            credentials.clientId,
            credentials.clientSecret
          )
          const newSession = await bullhornAPI.login(tokenData.accessToken)
          newSession.refreshToken = tokenData.refreshToken
          newSession.expiresAt = Date.now() + (tokenData.expiresIn * 1000)
          
          setSession(() => newSession)
          bullhornAPI.setSession(newSession)
          
          addLog('Token Refresh', 'success', 'Access token refreshed automatically')
        } catch (error) {
          toast.error('Failed to refresh access token. Please reconnect.')
          setSession(() => null)
        }
      }
    }

    const interval = setInterval(checkTokenExpiry, 30000)
    checkTokenExpiry()

    return () => clearInterval(interval)
  }, [session, credentials])

  const handleAuthenticated = (newSession: BullhornSession) => {
    setSession(() => newSession)
    bullhornAPI.setSession(newSession)
    setIsOAuthCallback(false)
    
    if (credentials) {
      const matchingConnection = savedConnections?.find(
        conn => conn.clientId === credentials.clientId
      )
      if (matchingConnection) {
        setCurrentConnectionId(() => matchingConnection.id)
        setSavedConnections((current) => 
          (current || []).map(conn => 
            conn.id === matchingConnection.id ? { ...conn, lastUsed: Date.now() } : conn
          )
        )
      }
    }
  }

  const handleCancelOAuth = () => {
    setIsOAuthCallback(false)
    window.history.replaceState({}, document.title, window.location.pathname)
  }

  const handleSaveCredentials = (clientId: string, clientSecret: string) => {
    setCredentials(() => ({ clientId, clientSecret } as { clientId: string; clientSecret: string }))
  }

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect?')) {
      setSession(() => null)
      setCurrentConnectionId(() => null)
    }
  }

  const addLog = (operation: string, status: 'success' | 'error', message: string, details?: any) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      operation,
      status,
      message,
      details,
      entity: details?.entity,
      recordCount: details?.successCount || details?.updatedCount || details?.recordCount,
      rollbackData: details?.rollbackData
    }
    setLogs((currentLogs) => [newLog, ...(currentLogs || [])])
  }

  const clearLogs = () => {
    setLogs(() => [])
  }

  const updateLog = (logId: string, updates: Partial<AuditLog>) => {
    setLogs((currentLogs) => 
      (currentLogs || []).map(log => 
        log.id === logId ? { ...log, ...updates } : log
      )
    )
  }

  const handleSaveConnection = (connection: Omit<SavedConnection, 'id' | 'createdAt'>) => {
    const newConnection: SavedConnection = {
      ...connection,
      id: `conn-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: Date.now()
    }
    setSavedConnections((current) => [...(current || []), newConnection])
  }

  const handleDeleteConnection = (id: string) => {
    setSavedConnections((current) => (current || []).filter(conn => conn.id !== id))
  }

  const handleUpdateConnection = (id: string, updates: Partial<SavedConnection>) => {
    setSavedConnections((current) => 
      (current || []).map(conn => 
        conn.id === id ? { ...conn, ...updates } : conn
      )
    )
  }

  const handleSelectConnectionFromManager = async (connection: SavedConnection) => {
    setSavedConnections((current) => 
      (current || []).map(conn => 
        conn.id === connection.id ? { ...conn, lastUsed: Date.now() } : conn
      )
    )
    
    setConnectionManagerOpen(false)
    setPreselectedConnection(connection)
    setAuthDialogOpen(true)
    toast.success(`Loaded connection: ${connection.name}`)
  }

  const handleQuickSwitchConnection = async (connection: SavedConnection) => {
    try {
      toast.loading('Switching connection...', { id: 'switch-connection' })

      setCredentials(() => ({ 
        clientId: connection.clientId, 
        clientSecret: connection.clientSecret 
      }))

      const newSession = await bullhornAPI.authenticate({
        clientId: connection.clientId,
        clientSecret: connection.clientSecret,
        username: connection.username,
        password: connection.password
      })

      setSession(() => newSession)
      bullhornAPI.setSession(newSession)
      
      setCurrentConnectionId(() => connection.id)
      setSavedConnections((current) => 
        (current || []).map(conn => 
          conn.id === connection.id ? { ...conn, lastUsed: Date.now() } : conn
        )
      )

      toast.success(`Switched to ${connection.name}`, { id: 'switch-connection' })
      addLog('Connection Switch', 'success', `Switched to connection: ${connection.name}`)
    } catch (error) {
      toast.error('Failed to switch connection. Please try again.', { id: 'switch-connection' })
      addLog('Connection Switch', 'error', `Failed to switch to ${connection.name}`, { error: String(error) })
    }
  }

  const currentLogs = logs || []

  if (session) {
    bullhornAPI.setSession(session)
  }

  if (isOAuthCallback) {
    return (
      <>
        <Toaster position="top-right" />
        <OAuthCallback 
          onAuthenticated={handleAuthenticated} 
          onCancel={handleCancelOAuth}
          storedCredentials={credentials || null}
          onSaveCredentials={handleSaveCredentials}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="text-accent" size={32} weight="duotone" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Bullhorn Data Manager</h1>
                <p className="text-sm text-muted-foreground">Direct API integration for advanced data operations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {session ? (
                <>
                  <ConnectionSwitcher
                    connections={savedConnections || []}
                    currentConnectionId={currentConnectionId || undefined}
                    onSelectConnection={handleQuickSwitchConnection}
                    onManageConnections={() => setConnectionManagerOpen(true)}
                    onNewConnection={() => setAuthDialogOpen(true)}
                  />
                  <Badge variant="outline" className="font-mono">
                    Connected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    <SignOut />
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setConnectionManagerOpen(true)}>
                    <Faders />
                    Saved Connections
                  </Button>
                  <Button onClick={() => setAuthDialogOpen(true)}>
                    <Database />
                    Connect to Bullhorn
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!session ? (
          <div className="text-center py-20">
            <Database size={64} className="mx-auto mb-6 text-accent opacity-50" weight="duotone" />
            <h2 className="text-3xl font-bold mb-3">Welcome to Bullhorn Data Manager</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Connect to your Bullhorn instance to access QueryBlast, CSV Loader, SmartStack v2, 
              QueryStack, and comprehensive audit logging features.
            </p>
            <Button size="lg" onClick={() => setAuthDialogOpen(true)}>
              <Database />
              Connect to Bullhorn
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
              <TabsTrigger value="queryblast" className="gap-2">
                <MagnifyingGlass size={18} />
                <span className="hidden sm:inline">QueryBlast</span>
              </TabsTrigger>
              <TabsTrigger value="csvloader" className="gap-2">
                <Upload size={18} />
                <span className="hidden sm:inline">CSV Loader</span>
              </TabsTrigger>
              <TabsTrigger value="smartstack" className="gap-2">
                <Stack size={18} />
                <span className="hidden sm:inline">SmartStack</span>
              </TabsTrigger>
              <TabsTrigger value="querystack" className="gap-2">
                <ChartLineUp size={18} />
                <span className="hidden sm:inline">QueryStack</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <ClockCounterClockwise size={18} />
                <span className="hidden sm:inline">Logs</span>
                {currentLogs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {currentLogs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="queryblast" className="space-y-6">
              <QueryBlast onLog={addLog} />
            </TabsContent>

            <TabsContent value="csvloader" className="space-y-6">
              <CSVLoader onLog={addLog} />
            </TabsContent>

            <TabsContent value="smartstack" className="space-y-6">
              <SmartStack onLog={addLog} />
            </TabsContent>

            <TabsContent value="querystack" className="space-y-6">
              <QueryStack onLog={addLog} />
            </TabsContent>

            <TabsContent value="logs" className="space-y-6">
              <AuditLogs logs={currentLogs} onClearLogs={clearLogs} onUpdateLog={updateLog} onLog={addLog} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={(open) => {
          setAuthDialogOpen(open)
          if (!open) {
            setPreselectedConnection(null)
          }
        }}
        onAuthenticated={handleAuthenticated}
        preselectedConnection={preselectedConnection}
      />

      <ConnectionManager
        open={connectionManagerOpen}
        onOpenChange={setConnectionManagerOpen}
        connections={savedConnections || []}
        onSaveConnection={handleSaveConnection}
        onDeleteConnection={handleDeleteConnection}
        onSelectConnection={handleSelectConnectionFromManager}
        onUpdateConnection={handleUpdateConnection}
      />
    </div>
  )
}

export default App