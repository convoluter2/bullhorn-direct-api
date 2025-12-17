import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Warning, Bug, Play, ArrowRight, Copy } from '@phosphor-icons/react'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { toast } from 'sonner'

interface DiagnosticResult {
  test: string
  status: 'success' | 'error' | 'warning' | 'info'
  message: string
  details?: any
}

export function OAuthDiagnostics() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [testLogs, setTestLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 12)
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setTestLogs(prev => [...prev, logMessage])
  }

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result])
    addLog(`${result.status.toUpperCase()}: ${result.test} - ${result.message}`)
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])
    setTestLogs([])

    addLog('🚀 Starting OAuth diagnostics...')

    try {
      addLog('Test 1: Check for saved connections')
      const connections = await secureCredentialsAPI.getConnections()
      
      if (connections.length === 0) {
        addResult({
          test: 'Saved Connections',
          status: 'error',
          message: 'No saved connections found',
          details: 'You need to save at least one connection with credentials before testing'
        })
        setIsRunning(false)
        return
      }

      addResult({
        test: 'Saved Connections',
        status: 'success',
        message: `Found ${connections.length} connection(s)`,
        details: connections.map(c => c.name).join(', ')
      })

      addLog('Test 2: Find Fastaff or first connection')
      const testConnection = connections.find(c => 
        c.name.toLowerCase().includes('fastaff') || c.tenant.toLowerCase().includes('fastaff')
      ) || connections[0]

      addResult({
        test: 'Test Connection Selected',
        status: 'info',
        message: `Using: ${testConnection.name} (${testConnection.tenant} - ${testConnection.environment})`,
        details: testConnection
      })

      addLog('Test 3: Load credentials')
      const credentials = await secureCredentialsAPI.getCredentials(testConnection.id)

      if (!credentials) {
        addResult({
          test: 'Load Credentials',
          status: 'error',
          message: 'No credentials found for selected connection',
          details: 'Connection may not have been saved properly'
        })
        setIsRunning(false)
        return
      }

      const missingFields: string[] = []
      if (!credentials.clientId) missingFields.push('clientId')
      if (!credentials.clientSecret) missingFields.push('clientSecret')
      if (!credentials.username) missingFields.push('username')
      if (!credentials.password) missingFields.push('password')

      if (missingFields.length > 0) {
        addResult({
          test: 'Validate Credentials',
          status: 'error',
          message: `Missing required fields: ${missingFields.join(', ')}`,
          details: credentials
        })
        setIsRunning(false)
        return
      }

      addResult({
        test: 'Validate Credentials',
        status: 'success',
        message: 'All required credential fields present',
        details: {
          clientId: credentials.clientId.substring(0, 20) + '...',
          hasSecret: !!credentials.clientSecret,
          username: credentials.username,
          hasPassword: !!credentials.password
        }
      })

      addLog('Test 4: Generate OAuth URL')
      const authUrl = bullhornAPI.getAuthorizationUrl(
        credentials.clientId,
        'test-state',
        credentials.username,
        credentials.password
      )

      if (!authUrl || !authUrl.includes('client_id') || !authUrl.includes('action=Login')) {
        addResult({
          test: 'Generate OAuth URL',
          status: 'error',
          message: 'OAuth URL missing required parameters',
          details: { url: authUrl }
        })
      } else {
        addResult({
          test: 'Generate OAuth URL',
          status: 'success',
          message: 'OAuth URL generated correctly',
          details: {
            length: authUrl.length,
            hasClientId: authUrl.includes('client_id'),
            hasUsername: authUrl.includes('username='),
            hasPassword: authUrl.includes('password='),
            hasAction: authUrl.includes('action=Login'),
            preview: authUrl.substring(0, 100) + '...'
          }
        })
      }

      addLog('Test 5: Test popup creation')
      try {
        const testPopup = window.open('about:blank', 'test-popup', 'width=100,height=100')
        if (!testPopup) {
          addResult({
            test: 'Popup Support',
            status: 'error',
            message: 'Popups are blocked in your browser',
            details: 'Please enable popups for this site to use automated OAuth'
          })
        } else {
          testPopup.close()
          addResult({
            test: 'Popup Support',
            status: 'success',
            message: 'Browser allows popups',
            details: 'Popup test succeeded'
          })
        }
      } catch (e) {
        addResult({
          test: 'Popup Support',
          status: 'error',
          message: 'Popup test failed',
          details: e instanceof Error ? e.message : String(e)
        })
      }

      addLog('Test 6: Check KV storage')
      try {
        await window.spark.kv.set('test-key', { test: 'value' })
        const testValue = await window.spark.kv.get('test-key')
        await window.spark.kv.delete('test-key')
        
        if (testValue && typeof testValue === 'object' && 'test' in testValue) {
          addResult({
            test: 'KV Storage',
            status: 'success',
            message: 'KV storage working correctly',
            details: 'Set, get, and delete operations succeeded'
          })
        } else {
          addResult({
            test: 'KV Storage',
            status: 'error',
            message: 'KV storage not working as expected',
            details: { retrievedValue: testValue }
          })
        }
      } catch (e) {
        addResult({
          test: 'KV Storage',
          status: 'error',
          message: 'KV storage test failed',
          details: e instanceof Error ? e.message : String(e)
        })
      }

      addLog('Test 7: Test programmatic auth flow')
      try {
        addLog('Attempting programmatic authentication...')
        const session = await bullhornAPI.authenticate({
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          username: credentials.username,
          password: credentials.password
        })

        if (!session.BhRestToken || !session.restUrl) {
          addResult({
            test: 'Programmatic Auth',
            status: 'warning',
            message: 'Session created but missing fields',
            details: {
              hasToken: !!session.BhRestToken,
              hasRestUrl: !!session.restUrl,
              corporationId: session.corporationId
            }
          })
        } else {
          addResult({
            test: 'Programmatic Auth',
            status: 'success',
            message: 'Authenticated successfully via programmatic flow',
            details: {
              hasToken: !!session.BhRestToken,
              hasRestUrl: !!session.restUrl,
              corporationId: session.corporationId,
              userId: session.userId
            }
          })
        }
      } catch (authError) {
        addLog('Programmatic auth failed: ' + (authError instanceof Error ? authError.message : String(authError)))
        addResult({
          test: 'Programmatic Auth',
          status: 'warning',
          message: 'Programmatic auth failed - popup method required',
          details: authError instanceof Error ? authError.message : String(authError)
        })

        addLog('This is expected - some Bullhorn instances require interactive login')
        addResult({
          test: 'Auth Method',
          status: 'info',
          message: 'Your Bullhorn instance requires popup-based OAuth',
          details: 'This is normal. Use the "Start Popup OAuth Flow" button in the connection dialog.'
        })
      }

      addLog('✅ Diagnostics complete')
      toast.success('Diagnostics complete - check results below')

    } catch (error) {
      addLog('❌ Diagnostics failed: ' + (error instanceof Error ? error.message : String(error)))
      addResult({
        test: 'Diagnostics',
        status: 'error',
        message: 'Diagnostic test suite failed',
        details: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsRunning(false)
    }
  }

  const copyLogs = () => {
    const logText = testLogs.join('\n')
    navigator.clipboard.writeText(logText)
    toast.success('Logs copied to clipboard')
  }

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" weight="fill" size={20} />
      case 'error':
        return <XCircle className="text-red-500" weight="fill" size={20} />
      case 'warning':
        return <Warning className="text-yellow-500" weight="fill" size={20} />
      case 'info':
        return <ArrowRight className="text-blue-500" weight="fill" size={20} />
    }
  }

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/5 border-green-500/20'
      case 'error':
        return 'bg-red-500/5 border-red-500/20'
      case 'warning':
        return 'bg-yellow-500/5 border-yellow-500/20'
      case 'info':
        return 'bg-blue-500/5 border-blue-500/20'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bug size={24} weight="fill" className="text-accent" />
              OAuth Flow Diagnostics
            </CardTitle>
            <CardDescription>
              Comprehensive testing suite to identify OAuth authentication issues
            </CardDescription>
          </div>
          <Button onClick={runDiagnostics} disabled={isRunning} size="lg">
            {isRunning ? 'Running Tests...' : (
              <>
                <Play />
                Run Diagnostics
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            This tool will test your saved connections, credentials, OAuth URL generation, popup support, 
            and attempt authentication. Review the results to identify any configuration issues.
          </AlertDescription>
        </Alert>

        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Test Results</h3>
              <Badge variant="outline">
                {results.filter(r => r.status === 'success').length} / {results.length} passed
              </Badge>
            </div>

            {results.map((result, index) => (
              <div 
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getStatusColor(result.status)}`}
              >
                <div className="mt-0.5">
                  {getStatusIcon(result.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{result.test}</div>
                  <p className="text-sm text-muted-foreground mt-0.5">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        View details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {testLogs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Console Logs</h3>
              <Button onClick={copyLogs} size="sm" variant="outline">
                <Copy size={16} />
                Copy Logs
              </Button>
            </div>
            <div className="bg-muted p-3 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-xs font-mono space-y-1">
                {testLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </pre>
            </div>
          </div>
        )}

        {!isRunning && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Click "Run Diagnostics" to test your OAuth configuration
          </div>
        )}
      </CardContent>
    </Card>
  )
}
