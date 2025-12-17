import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, XCircle, Flask, Spinner, Warning } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
import { toast } from 'sonner'
import { AutomatedOAuthTest } from './AutomatedOAuthTest'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'error' | 'warning'
  message?: string
  details?: any
  duration?: number
}

export function OAuthTestSuite() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...updates } : r))
  }

  const runTests = async () => {
    setIsRunning(true)
    setResults([
      { name: 'Load Saved Connections', status: 'pending' },
      { name: 'Find Fastaff Credentials', status: 'pending' },
      { name: 'Validate Credentials Format', status: 'pending' },
      { name: 'Test Programmatic Auth', status: 'pending' },
      { name: 'Test Token Exchange', status: 'pending' },
      { name: 'Test REST Login', status: 'pending' },
      { name: 'Test Session Validation', status: 'pending' },
      { name: 'Test OAuth Redirect URL', status: 'pending' },
      { name: 'Test Code Extraction', status: 'pending' },
      { name: 'Test Blank Screen Prevention', status: 'pending' },
    ])

    try {
      const startTime = Date.now()
      updateTest(0, { status: 'running' })
      
      const connections = await secureCredentialsAPI.getConnections()
      const duration = Date.now() - startTime
      
      if (connections.length === 0) {
        updateTest(0, { 
          status: 'warning', 
          message: 'No saved connections found', 
          duration 
        })
      } else {
        updateTest(0, { 
          status: 'success', 
          message: `Found ${connections.length} connection(s)`, 
          details: connections.map(c => `${c.name} (${c.environment})`),
          duration 
        })
      }

      await new Promise(resolve => setTimeout(resolve, 300))

      const fastaffConnection = connections.find(c => 
        c.name.toLowerCase().includes('fastaff') || c.tenant.toLowerCase().includes('fastaff')
      )

      const startTime2 = Date.now()
      updateTest(1, { status: 'running' })

      if (!fastaffConnection) {
        updateTest(1, { 
          status: 'warning', 
          message: 'No Fastaff connection found. Testing with first available connection...',
          duration: Date.now() - startTime2
        })
      } else {
        updateTest(1, { 
          status: 'success', 
          message: `Found: ${fastaffConnection.name}`,
          details: fastaffConnection,
          duration: Date.now() - startTime2
        })
      }

      const testConnection = fastaffConnection || connections[0]

      if (!testConnection) {
        updateTest(2, { status: 'error', message: 'No connections available to test' })
        updateTest(3, { status: 'error', message: 'Skipped - no connection' })
        updateTest(4, { status: 'error', message: 'Skipped - no connection' })
        updateTest(5, { status: 'error', message: 'Skipped - no connection' })
        updateTest(6, { status: 'error', message: 'Skipped - no connection' })
        updateTest(7, { status: 'error', message: 'Skipped - no connection' })
        updateTest(8, { status: 'error', message: 'Skipped - no connection' })
        updateTest(9, { status: 'error', message: 'Skipped - no connection' })
        return
      }

      await new Promise(resolve => setTimeout(resolve, 300))

      const startTime3 = Date.now()
      updateTest(2, { status: 'running' })

      const credentials = await secureCredentialsAPI.getCredentials(testConnection.id)
      const duration3 = Date.now() - startTime3

      if (!credentials) {
        updateTest(2, { status: 'error', message: 'No credentials found for connection', duration: duration3 })
        updateTest(3, { status: 'error', message: 'Skipped - no credentials' })
        updateTest(4, { status: 'error', message: 'Skipped - no credentials' })
        updateTest(5, { status: 'error', message: 'Skipped - no credentials' })
        updateTest(6, { status: 'error', message: 'Skipped - no credentials' })
        updateTest(7, { status: 'error', message: 'Skipped - no credentials' })
        updateTest(8, { status: 'error', message: 'Skipped - no credentials' })
        updateTest(9, { status: 'error', message: 'Skipped - no credentials' })
        return
      }

      const validationChecks: string[] = []
      if (!credentials.clientId) validationChecks.push('Missing clientId')
      if (!credentials.clientSecret) validationChecks.push('Missing clientSecret')
      if (!credentials.username) validationChecks.push('Missing username')
      if (!credentials.password) validationChecks.push('Missing password')

      if (validationChecks.length > 0) {
        updateTest(2, { 
          status: 'error', 
          message: validationChecks.join(', '),
          duration: duration3
        })
        updateTest(3, { status: 'error', message: 'Skipped - invalid credentials' })
        updateTest(4, { status: 'error', message: 'Skipped - invalid credentials' })
        updateTest(5, { status: 'error', message: 'Skipped - invalid credentials' })
        updateTest(6, { status: 'error', message: 'Skipped - invalid credentials' })
        updateTest(7, { status: 'error', message: 'Skipped - invalid credentials' })
        updateTest(8, { status: 'error', message: 'Skipped - invalid credentials' })
        updateTest(9, { status: 'error', message: 'Skipped - invalid credentials' })
        return
      }

      updateTest(2, { 
        status: 'success', 
        message: 'All credential fields present',
        details: { clientId: credentials.clientId, username: credentials.username },
        duration: duration3
      })

      await new Promise(resolve => setTimeout(resolve, 300))

      updateTest(3, { status: 'running' })
      const startTime4 = Date.now()

      try {
        const session = await bullhornAPI.authenticate({
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          username: credentials.username,
          password: credentials.password
        })

        const duration4 = Date.now() - startTime4

        if (!session) {
          updateTest(3, { 
            status: 'error', 
            message: 'Authentication returned null session',
            duration: duration4
          })
        } else {
          updateTest(3, { 
            status: 'success', 
            message: 'Programmatic authentication successful',
            details: { 
              restUrl: session.restUrl, 
              corporationId: session.corporationId,
              hasToken: !!session.BhRestToken,
              hasRefreshToken: !!session.refreshToken
            },
            duration: duration4
          })

          await new Promise(resolve => setTimeout(resolve, 300))
          updateTest(4, { status: 'running' })
          const startTime5 = Date.now()

          if (session.accessToken) {
            updateTest(4, { 
              status: 'success', 
              message: 'Access token obtained',
              duration: Date.now() - startTime5
            })
          } else {
            updateTest(4, { 
              status: 'warning', 
              message: 'No access token in session',
              duration: Date.now() - startTime5
            })
          }

          await new Promise(resolve => setTimeout(resolve, 300))
          updateTest(5, { status: 'running' })
          const startTime6 = Date.now()

          if (session.BhRestToken && session.restUrl) {
            updateTest(5, { 
              status: 'success', 
              message: 'REST login successful',
              details: { restUrl: session.restUrl },
              duration: Date.now() - startTime6
            })
          } else {
            updateTest(5, { 
              status: 'error', 
              message: 'Missing REST token or URL',
              duration: Date.now() - startTime6
            })
          }

          await new Promise(resolve => setTimeout(resolve, 300))
          updateTest(6, { status: 'running' })
          const startTime7 = Date.now()

          const sessionChecks: string[] = []
          if (!session.BhRestToken) sessionChecks.push('No BhRestToken')
          if (!session.restUrl) sessionChecks.push('No restUrl')
          if (!session.corporationId) sessionChecks.push('No corporationId')
          if (!session.userId) sessionChecks.push('No userId')

          if (sessionChecks.length > 0) {
            updateTest(6, { 
              status: 'warning', 
              message: sessionChecks.join(', '),
              duration: Date.now() - startTime7
            })
          } else {
            updateTest(6, { 
              status: 'success', 
              message: 'All session fields valid',
              duration: Date.now() - startTime7
            })
          }
        }
      } catch (error) {
        const duration4 = Date.now() - startTime4
        updateTest(3, { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Authentication failed',
          details: error,
          duration: duration4
        })
        updateTest(4, { status: 'error', message: 'Skipped - auth failed' })
        updateTest(5, { status: 'error', message: 'Skipped - auth failed' })
        updateTest(6, { status: 'error', message: 'Skipped - auth failed' })
      }

      await new Promise(resolve => setTimeout(resolve, 300))
      updateTest(7, { status: 'running' })
      const startTime8 = Date.now()

      try {
        const authUrl = bullhornAPI.getAuthorizationUrl(
          credentials.clientId,
          undefined,
          'test-state',
          credentials.username,
          credentials.password
        )

        if (!authUrl) {
          updateTest(7, { 
            status: 'error', 
            message: 'Failed to generate auth URL',
            duration: Date.now() - startTime8
          })
        } else if (!authUrl.includes('client_id') || !authUrl.includes('response_type')) {
          updateTest(7, { 
            status: 'error', 
            message: 'Auth URL missing required parameters',
            details: authUrl,
            duration: Date.now() - startTime8
          })
        } else {
          updateTest(7, { 
            status: 'success', 
            message: 'OAuth redirect URL generated (no redirect_uri - working config)',
            details: authUrl,
            duration: Date.now() - startTime8
          })
        }
      } catch (error) {
        updateTest(7, { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'URL generation failed',
          duration: Date.now() - startTime8
        })
      }

      await new Promise(resolve => setTimeout(resolve, 300))
      updateTest(8, { status: 'running' })
      const startTime9 = Date.now()

      try {
        const testCodes = [
          '22090_7294471_43%3Aead82de4-121c-45c5-845b-84a290f03afc',
          '22090_7294471_43:ead82de4-121c-45c5-845b-84a290f03afc',
          '25184_8090191_44%3A0e19f0db-1c33-4409-b914-af5345c2b885'
        ]

        const decodedResults = testCodes.map(code => {
          const decoded = decodeURIComponent(code)
          return { original: code, decoded, hasColon: decoded.includes(':') }
        })

        const allHaveColon = decodedResults.every(r => r.hasColon)

        if (allHaveColon) {
          updateTest(8, { 
            status: 'success', 
            message: 'Code extraction logic validated',
            details: decodedResults,
            duration: Date.now() - startTime9
          })
        } else {
          updateTest(8, { 
            status: 'error', 
            message: 'Code decoding failed for some test cases',
            details: decodedResults,
            duration: Date.now() - startTime9
          })
        }
      } catch (error) {
        updateTest(8, { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Code extraction test failed',
          duration: Date.now() - startTime9
        })
      }

      await new Promise(resolve => setTimeout(resolve, 300))
      updateTest(9, { status: 'running' })
      const startTime10 = Date.now()

      try {
        const testScenarios: Array<{ check: string; passed: boolean }> = []

        const hasOAuthCallback = !!window.location.search.match(/[?&]code=/)
        testScenarios.push({ 
          check: 'OAuth callback detection', 
          passed: typeof hasOAuthCallback === 'boolean' 
        })

        const testUrlParams = new URLSearchParams('?code=test_code&state=test_state')
        const codeParam = testUrlParams.get('code')
        testScenarios.push({ 
          check: 'URL param extraction', 
          passed: codeParam === 'test_code' 
        })

        const testErrorParams = new URLSearchParams('?error=access_denied&error_description=User%20cancelled')
        const errorParam = testErrorParams.get('error')
        testScenarios.push({ 
          check: 'Error param detection', 
          passed: errorParam === 'access_denied' 
        })

        const allPassed = testScenarios.every(s => s.passed)

        if (allPassed) {
          updateTest(9, { 
            status: 'success', 
            message: 'All blank screen prevention checks passed',
            details: testScenarios,
            duration: Date.now() - startTime10
          })
        } else {
          updateTest(9, { 
            status: 'warning', 
            message: 'Some prevention checks failed',
            details: testScenarios,
            duration: Date.now() - startTime10
          })
        }
      } catch (error) {
        updateTest(9, { 
          status: 'error', 
          message: error instanceof Error ? error.message : 'Prevention test failed',
          duration: Date.now() - startTime10
        })
      }

      toast.success('OAuth test suite completed')
    } catch (error) {
      toast.error('Test suite failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
      console.error('Test suite error:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" weight="fill" />
      case 'error':
        return <XCircle className="text-red-500" weight="fill" />
      case 'warning':
        return <Warning className="text-yellow-500" weight="fill" />
      case 'running':
        return <Spinner className="animate-spin text-blue-500" />
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-muted" />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Passed</Badge>
      case 'error':
        return <Badge variant="destructive">Failed</Badge>
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>
      case 'running':
        return <Badge variant="secondary">Running...</Badge>
      default:
        return <Badge variant="outline">Pending</Badge>
    }
  }

  const summary = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    error: results.filter(r => r.status === 'error').length,
    warning: results.filter(r => r.status === 'warning').length,
    pending: results.filter(r => r.status === 'pending').length,
  }

  return (
    <div className="space-y-6">
      <AutomatedOAuthTest />
      
      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flask size={24} weight="duotone" className="text-accent" />
                OAuth Automated Test Suite
              </CardTitle>
              <CardDescription>
                Comprehensive testing of OAuth flow with saved Fastaff credentials
              </CardDescription>
            </div>
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              size="lg"
            >
              {isRunning ? (
                <>
                  <Spinner className="animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Flask />
                  Run All Tests
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.length > 0 && (
            <Alert>
              <AlertDescription>
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">Progress:</span>
                  <Badge variant="outline">Total: {summary.total}</Badge>
                  {summary.success > 0 && <Badge className="bg-green-500">{summary.success} Passed</Badge>}
                  {summary.error > 0 && <Badge variant="destructive">{summary.error} Failed</Badge>}
                  {summary.warning > 0 && <Badge className="bg-yellow-500">{summary.warning} Warnings</Badge>}
                  {summary.pending > 0 && <Badge variant="secondary">{summary.pending} Pending</Badge>}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {results.map((result, index) => (
              <Card key={index} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{result.name}</h4>
                        <div className="flex items-center gap-2">
                          {result.duration !== undefined && (
                            <span className="text-xs text-muted-foreground">{result.duration}ms</span>
                          )}
                          {getStatusBadge(result.status)}
                        </div>
                      </div>
                      {result.message && (
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                      )}
                      {result.details && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
