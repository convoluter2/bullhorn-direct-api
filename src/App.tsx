import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Database, MagnifyingGlass, Upload, Stack, ClockCounterClockwise, SignOut, ChartLineUp, Faders, Export, Flask } from '@phosphor-icons/react'
import { AuthDialog } from '@/components/AuthDialog'
import { OAuthCallback } from '@/components/OAuthCallback'
import { QueryBlast } from '@/components/QueryBlast'
import { CSVLoader } from '@/components/CSVLoader'
import { SmartStack } from '@/components/SmartStack'
import { QueryStack } from '@/components/QueryStack'
import { AuditLogs } from '@/components/AuditLogs'
import { WFNExport } from '@/components/WFNExport'
import { SessionDebugPanel } from '@/components/SessionDebugPanel'
import { ConnectionManager, type SavedConnection, type SecureCredentials } from '@/components/ConnectionManager'
import { ConnectionSwitcher } from '@/components/ConnectionSwitcher'
import { CookieSessionClearer } from '@/components/CookieSessionClearer'
import { DataStorageClearer } from '@/components/DataStorageClearer'
import { RateLimitStatus } from '@/components/RateLimitStatus'
import { RateLimitAnalytics } from '@/components/RateLimitAnalytics'
import { OperatorTestSuite } from '@/components/OperatorTestSuite'
import { OAuthTestSuite } from '@/components/OAuthTestSuite'
import { OAuthDiagnostics } from '@/components/OAuthDiagnostics'
import { ConsoleMonitor } from '@/components/ConsoleMonitor'
import { ToOneFieldTest } from '@/components/ToOneFieldTest'
import { ComprehensiveFieldTest } from '@/components/ComprehensiveFieldTest'
import { PauseResumeTests } from '@/components/PauseResumeTests'
import { SpeedTest } from '@/components/SpeedTest'
import { DiagnosticPanel } from '@/components/DiagnosticPanel'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
import { sanitizeLogDetails } from '@/lib/utils'
import { toast } from 'sonner'
import type { BullhornSession, AuditLog } from '@/lib/types'

function App() {
  const [session, setSession] = useKV<BullhornSession | null>('bullhorn-session', null)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [connectionManagerOpen, setConnectionManagerOpen] = useState(false)
  const [logs, setLogs] = useKV<AuditLog[]>('audit-logs', [])
  const [activeTab, setActiveTab] = useState('queryblast')
  const [testingSubTab, setTestingSubTab] = useState('operators')
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([])
  const [isOAuthCallback, setIsOAuthCallback] = useState(false)
  const [currentConnectionId, setCurrentConnectionId] = useKV<string | null>('current-connection-id', null)
  const [preselectedConnection, setPreselectedConnection] = useState<SavedConnection | null>(null)

  useEffect(() => {
    const loadConnections = async () => {
      const connections = await secureCredentialsAPI.getConnections()
      setSavedConnections(connections)
    }
    loadConnections()
  }, [])

  const addLog = useCallback((operation: string, status: 'success' | 'error', message: string, details?: any) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      operation,
      status,
      message,
      details: details ? sanitizeLogDetails(details) : undefined,
      entity: details?.entity,
      recordCount: details?.successCount || details?.updatedCount || details?.recordCount,
      rollbackData: details?.rollbackData,
      failedOperations: details?.failedOperations
    }
    setLogs((currentLogs) => [newLog, ...(currentLogs || [])])
  }, [setLogs])

  const clearLogs = useCallback(() => {
    setLogs(() => [])
  }, [setLogs])

  const updateLog = useCallback((logId: string, updates: Partial<AuditLog>) => {
    setLogs((currentLogs) => 
      (currentLogs || []).map(log => 
        log.id === logId ? { ...log, ...updates } : log
      )
    )
  }, [setLogs])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const errorParam = urlParams.get('error')
    
    console.log('App - Checking for OAuth callback:', { 
      hasCode: !!code, 
      hasError: !!errorParam,
      fullSearch: window.location.search 
    })
    
    if (code || errorParam) {
      console.log('App - Setting isOAuthCallback to true')
      setIsOAuthCallback(true)
    } else {
      console.log('App - No OAuth callback detected')
    }
  }, [])

  useEffect(() => {
    if (!session || !session.refreshToken || !session.expiresAt || !currentConnectionId) {
      return
    }

    const checkTokenExpiry = async () => {
      if (!session || !session.refreshToken || !session.expiresAt || !currentConnectionId) {
        return
      }
      
      const now = Date.now()
      const timeUntilExpiry = session.expiresAt - now

      if (timeUntilExpiry < 60000 && timeUntilExpiry > 0) {
        try {
          console.log('🔄 Token expiring soon, refreshing...', {
            currentConnectionId,
            corporationId: session.corporationId
          })
          
          const credentials = await secureCredentialsAPI.getCredentials(currentConnectionId)
          if (!credentials) {
            toast.error('Failed to retrieve credentials for token refresh')
            console.error('❌ No credentials found for connection:', currentConnectionId)
            return
          }

          console.log('🔑 Refreshing token with credentials for:', credentials.username)
          const tokenData = await bullhornAPI.refreshAccessToken(
            session.refreshToken,
            credentials.clientId,
            credentials.clientSecret,
            credentials.username
          )
          
          const newSession = await bullhornAPI.login(tokenData.accessToken, credentials.username)
          newSession.refreshToken = tokenData.refreshToken
          newSession.expiresAt = Date.now() + (tokenData.expiresIn * 1000)
          
          console.log('✅ Token refreshed successfully:', {
            corporationId: newSession.corporationId,
            restUrl: newSession.restUrl
          })
          
          setSession(() => newSession)
          bullhornAPI.setSession(newSession)
          
          addLog('Token Refresh', 'success', 'Access token refreshed automatically', {
            connectionId: currentConnectionId,
            corporationId: newSession.corporationId
          })
        } catch (error) {
          console.error('❌ Token refresh failed:', error)
          toast.error('Failed to refresh access token. Please reconnect.')
          bullhornAPI.clearSession()
          setSession(() => null)
        }
      }
    }

    const interval = setInterval(checkTokenExpiry, 30000)
    return () => clearInterval(interval)
  }, [session, currentConnectionId, addLog, setSession])

  const handleAuthenticated = (newSession: BullhornSession, connectionId?: string) => {
    console.log('App - handleAuthenticated called:', { 
      hasSession: !!newSession, 
      connectionId,
      hasToken: !!newSession?.BhRestToken,
      corporationId: newSession?.corporationId,
      restUrl: newSession?.restUrl
    })
    
    try {
      console.log('🧹 Clearing old session before setting new one')
      const oldSession = bullhornAPI.getSession()
      if (oldSession) {
        console.log('   Old session:', {
          corporationId: oldSession.corporationId,
          restUrl: oldSession.restUrl
        })
      }
      
      bullhornAPI.clearSession()
      
      if (connectionId) {
        const connection = savedConnections.find(c => c.id === connectionId)
        if (connection) {
          const newSessionTenant = newSession.restUrl.match(/rest-services\/([^/]+)/)?.[1]
          console.log('✅ Connection authenticated:', {
            connectionName: connection.name,
            expectedTenant: connection.tenant,
            actualTenant: newSessionTenant,
            corporationId: newSession.corporationId
          })
        }
      }
      
      setSession(() => newSession)
      bullhornAPI.setSession(newSession)
      setIsOAuthCallback(false)
      
      if (connectionId) {
        setCurrentConnectionId(() => connectionId)
        const updatedConnections = savedConnections.map(conn => 
          conn.id === connectionId ? { ...conn, lastUsed: Date.now() } : conn
        )
        setSavedConnections(updatedConnections)
        secureCredentialsAPI.updateConnection(connectionId, { lastUsed: Date.now() })
        
        const connection = savedConnections.find(c => c.id === connectionId)
        if (connection) {
          addLog('Authentication', 'success', `Authenticated to ${connection.name}`, {
            connectionId,
            tenant: connection.tenant,
            environment: connection.environment,
            corporationId: newSession.corporationId,
            restUrl: newSession.restUrl
          })
        }
      }
      
      console.log('App - Authentication handling complete')
    } catch (error) {
      console.error('App - Error in handleAuthenticated:', error)
      toast.error('Failed to complete authentication setup')
      setIsOAuthCallback(false)
    }
  }

  const handleCancelOAuth = () => {
    console.log('App - OAuth cancelled by user')
    setIsOAuthCallback(false)
    window.history.replaceState({}, document.title, window.location.pathname)
    toast.info('Authentication cancelled')
  }

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect?')) {
      console.log('🔌 Disconnecting - clearing session and cache')
      bullhornAPI.clearSession()
      setSession(() => null)
      setCurrentConnectionId(() => null)
      addLog('Disconnect', 'success', 'Disconnected from Bullhorn and cleared session cache')
    }
  }

  const handleSaveConnection = async (connection: SavedConnection, credentials: SecureCredentials) => {
    console.log('💾 App - handleSaveConnection called:', {
      connectionId: connection.id,
      connectionName: connection.name,
      hasCredentials: !!credentials
    })
    
    await secureCredentialsAPI.saveConnection(connection)
    await secureCredentialsAPI.saveCredentials(connection.id, credentials)
    
    const connections = await secureCredentialsAPI.getConnections()
    console.log('✅ App - Connection saved, reloaded connections:', connections.length)
    setSavedConnections(connections)
  }

  const handleDeleteConnection = async (id: string) => {
    console.log('🗑️ App - handleDeleteConnection called:', id)
    await secureCredentialsAPI.deleteConnection(id)
    const connections = await secureCredentialsAPI.getConnections()
    console.log('✅ App - Connection deleted, reloaded connections:', connections.length)
    setSavedConnections(connections)
  }

  const handleUpdateConnection = async (id: string, updates: Partial<SavedConnection>, credentials?: SecureCredentials) => {
    console.log('📝 App - handleUpdateConnection called:', {
      connectionId: id,
      updates,
      hasCredentials: !!credentials
    })
    
    await secureCredentialsAPI.updateConnection(id, updates)
    if (credentials) {
      await secureCredentialsAPI.saveCredentials(id, credentials)
    }
    const connections = await secureCredentialsAPI.getConnections()
    console.log('✅ App - Connection updated, reloaded connections:', connections.length)
    setSavedConnections(connections)
  }

  const handleSelectConnectionFromManager = async (connection: SavedConnection) => {
    console.log('🎯 App - handleSelectConnectionFromManager called:', {
      connectionId: connection.id,
      connectionName: connection.name,
      tenant: connection.tenant,
      environment: connection.environment
    })
    
    try {
      await secureCredentialsAPI.updateConnection(connection.id, { lastUsed: Date.now() })
      const connections = await secureCredentialsAPI.getConnections()
      setSavedConnections(connections)
      
      console.log('📋 App - Opening manual auth dialog for selected connection')
      setConnectionManagerOpen(false)
      setPreselectedConnection(connection)
      setAuthDialogOpen(true)
      toast.info(`Opening authentication for ${connection.name}`)
    } catch (error) {
      console.error('❌ App - Error in handleSelectConnectionFromManager:', error)
      toast.error('Failed to load connection. Please try again.')
    }
  }

  const handleQuickSwitchConnection = async (connection: SavedConnection) => {
    try {
      toast.loading('Switching connection...', { id: 'switch-connection' })

      console.log('🔄 Switching connection - clearing old session completely')
      console.log('   Previous session:', {
        corporationId: session?.corporationId,
        restUrl: session?.restUrl
      })
      console.log('   Target connection:', {
        name: connection.name,
        tenant: connection.tenant,
        environment: connection.environment
      })
      
      bullhornAPI.clearSession()
      setSession(() => null)
      setCurrentConnectionId(() => null)
      
      await new Promise(resolve => setTimeout(resolve, 100))

      const credentials = await secureCredentialsAPI.getCredentials(connection.id)
      if (!credentials) {
        throw new Error('Credentials not found for this connection')
      }

      console.log('🔑 Authenticating with new connection:', connection.name)
      const newSession = await bullhornAPI.authenticate({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        username: credentials.username,
        password: credentials.password
      })
      
      const newSessionTenant = newSession.restUrl.match(/rest-services\/([^/]+)/)?.[1]
      console.log('✅ New session established:', {
        corporationId: newSession.corporationId,
        restUrl: newSession.restUrl,
        tenant: newSessionTenant,
        expectedTenant: connection.tenant
      })

      setSession(() => newSession)
      bullhornAPI.setSession(newSession)
      
      setCurrentConnectionId(() => connection.id)
      await secureCredentialsAPI.updateConnection(connection.id, { lastUsed: Date.now() })
      const connections = await secureCredentialsAPI.getConnections()
      setSavedConnections(connections)

      toast.success(`Switched to ${connection.name}`, { id: 'switch-connection' })
      addLog('Connection Switch', 'success', `Switched to connection: ${connection.name}`, { 
        connectionId: connection.id,
        tenant: connection.tenant,
        environment: connection.environment,
        corporationId: newSession.corporationId
      })
    } catch (error) {
      console.error('❌ Connection switch failed:', error)
      bullhornAPI.clearSession()
      setSession(() => null)
      setCurrentConnectionId(() => null)
      toast.error('Failed to switch connection. Please try again.', { id: 'switch-connection' })
      addLog('Connection Switch', 'error', `Failed to switch to ${connection.name}`, { error: String(error) })
    }
  }

  const currentLogs = logs || []

  useEffect(() => {
    if (session) {
      bullhornAPI.setSession(session)
    }
  }, [session])

  if (isOAuthCallback) {
    console.log('App - Rendering OAuthCallback component')
    return (
      <>
        <Toaster position="top-right" />
        <OAuthCallback 
          onAuthenticated={handleAuthenticated} 
          onCancel={handleCancelOAuth}
        />
      </>
    )
  }

  console.log('App - Rendering main app', { hasSession: !!session })

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Database className="text-accent" size={32} weight="duotone" />
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Bullhorn Data Manager</h1>
                  <p className="text-sm text-muted-foreground">Direct API integration for advanced data operations</p>
                </div>
                {session && savedConnections.find(conn => conn.id === currentConnectionId) && (
                  <>
                    <div className="h-12 w-px bg-border" />
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-accent">
                        {savedConnections.find(conn => conn.id === currentConnectionId)?.name}
                      </h2>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={savedConnections.find(conn => conn.id === currentConnectionId)?.environment === 'PROD' ? 'default' : 'secondary'}
                          className="text-sm font-semibold"
                        >
                          {savedConnections.find(conn => conn.id === currentConnectionId)?.environment}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {savedConnections.find(conn => conn.id === currentConnectionId)?.tenant}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DataStorageClearer />
              <CookieSessionClearer 
                onClear={() => {
                  console.log('🧹 Cookies cleared, disconnecting session')
                  bullhornAPI.clearSession()
                  setSession(() => null)
                  setCurrentConnectionId(() => null)
                }}
              />
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
                <Button variant="outline" onClick={() => setConnectionManagerOpen(true)}>
                  <Faders />
                  Saved Connections
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!session ? (
          <div className="space-y-8">
            <div className="text-center py-12">
              <Database size={64} className="mx-auto mb-6 text-accent opacity-50" weight="duotone" />
              <h2 className="text-3xl font-bold mb-3">Welcome to Bullhorn Data Manager</h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Connect to your Bullhorn instance to access QueryBlast, CSV Loader, SmartStack v2, 
                QueryStack, and comprehensive audit logging features.
              </p>
            </div>

            <ConnectionManager
              open={true}
              onOpenChange={() => {}}
              connections={savedConnections || []}
              onSaveConnection={handleSaveConnection}
              onDeleteConnection={handleDeleteConnection}
              onSelectConnection={handleSelectConnectionFromManager}
              onUpdateConnection={handleUpdateConnection}
              embedded={true}
            />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <SessionDebugPanel 
              session={session}
              currentConnectionId={currentConnectionId || null}
              connectionName={savedConnections.find(c => c.id === currentConnectionId)?.name}
              tenant={savedConnections.find(c => c.id === currentConnectionId)?.tenant}
              environment={savedConnections.find(c => c.id === currentConnectionId)?.environment}
            />
            
            <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
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
              <TabsTrigger value="wfn-export" className="gap-2">
                <Export size={18} />
                <span className="hidden sm:inline">WFN Export</span>
              </TabsTrigger>
              <TabsTrigger value="testing-tools" className="gap-2">
                <Flask size={18} />
                <span className="hidden sm:inline">Testing Tools</span>
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

            <TabsContent value="wfn-export" className="space-y-6">
              <WFNExport onLog={addLog} />
            </TabsContent>

            <TabsContent value="testing-tools" className="space-y-6">
              <Tabs value={testingSubTab} onValueChange={setTestingSubTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-8 lg:w-auto lg:inline-grid">
                  <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
                  <TabsTrigger value="operators">Operators</TabsTrigger>
                  <TabsTrigger value="toone-test">To-One Test</TabsTrigger>
                  <TabsTrigger value="field-tests">Field Tests</TabsTrigger>
                  <TabsTrigger value="oauth-test">OAuth Test</TabsTrigger>
                  <TabsTrigger value="pause-resume">Pause/Resume</TabsTrigger>
                  <TabsTrigger value="speed-test">Speed Test</TabsTrigger>
                  <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
                </TabsList>

                <TabsContent value="diagnostics">
                  <DiagnosticPanel />
                </TabsContent>

                <TabsContent value="operators">
                  <OperatorTestSuite />
                </TabsContent>

                <TabsContent value="toone-test">
                  <ToOneFieldTest />
                </TabsContent>

                <TabsContent value="field-tests">
                  <ComprehensiveFieldTest />
                </TabsContent>

                <TabsContent value="oauth-test">
                  <ConsoleMonitor />
                  <OAuthDiagnostics />
                  <OAuthTestSuite />
                </TabsContent>

                <TabsContent value="pause-resume">
                  <PauseResumeTests />
                </TabsContent>

                <TabsContent value="speed-test">
                  <SpeedTest />
                </TabsContent>

                <TabsContent value="rate-limits">
                  <RateLimitAnalytics />
                </TabsContent>
              </Tabs>
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