import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Toaster } from '@/components/ui/sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Database, MagnifyingGlass, Upload, Stack, ClockCounterClockwise, SignOut } from '@phosphor-icons/react'
import { AuthDialog } from '@/components/AuthDialog'
import { QueryBlast } from '@/components/QueryBlast'
import { CSVLoader } from '@/components/CSVLoader'
import { SmartStack } from '@/components/SmartStack'
import { AuditLogs } from '@/components/AuditLogs'
import { bullhornAPI } from '@/lib/bullhorn-api'
import type { BullhornSession, AuditLog } from '@/lib/types'

function App() {
  const [session, setSession] = useKV<BullhornSession | null>('bullhorn-session', null)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [logs, setLogs] = useKV<AuditLog[]>('audit-logs', [])
  const [activeTab, setActiveTab] = useState('queryblast')

  const handleAuthenticated = (newSession: BullhornSession) => {
    setSession(() => newSession)
    bullhornAPI.setSession(newSession)
  }

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect?')) {
      setSession(() => null)
    }
  }

  const addLog = (operation: string, status: 'success' | 'error', message: string, details?: any) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      operation,
      status,
      message,
      details
    }
    setLogs((currentLogs) => [newLog, ...(currentLogs || [])])
  }

  const clearLogs = () => {
    setLogs(() => [])
  }

  const currentLogs = logs || []

  if (session) {
    bullhornAPI.setSession(session)
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
                  <Badge variant="outline" className="font-mono">
                    Connected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    <SignOut />
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button onClick={() => setAuthDialogOpen(true)}>
                  <Database />
                  Connect to Bullhorn
                </Button>
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
              and comprehensive audit logging features.
            </p>
            <Button size="lg" onClick={() => setAuthDialogOpen(true)}>
              <Database />
              Connect to Bullhorn
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
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

            <TabsContent value="logs" className="space-y-6">
              <AuditLogs logs={currentLogs} onClearLogs={clearLogs} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  )
}

export default App