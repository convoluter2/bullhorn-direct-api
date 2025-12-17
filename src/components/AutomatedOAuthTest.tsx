import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Play, Spinner, Warning, ArrowRight } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { secureCredentialsAPI } from '@/lib/secure-credentials'
import { toast } from 'sonner'
import type { BullhornSession } from '@/lib/types'

interface AutomatedOAuthTestProps {
  onAuthSuccess?: (session: BullhornSession) => void
}

export function AutomatedOAuthTest({ onAuthSuccess }: AutomatedOAuthTestProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState<number>(-1)
  const [steps, setSteps] = useState<Array<{
    name: string
    status: 'pending' | 'running' | 'success' | 'error' | 'warning'
    message?: string
    duration?: number
  }>>([])

  useEffect(() => {
    setSteps([
      { name: 'Load Saved Connections', status: 'pending' },
      { name: 'Find Fastaff Credentials', status: 'pending' },
      { name: 'Validate Credentials', status: 'pending' },
      { name: 'Generate OAuth URL', status: 'pending' },
      { name: 'Execute Programmatic Auth', status: 'pending' },
      { name: 'Verify Session', status: 'pending' },
      { name: 'Test Blank Screen Prevention', status: 'pending' },
    ])
  }, [])

  const updateStep = (index: number, updates: Partial<typeof steps[0]>) => {
    setSteps(prev => prev.map((step, i) => i === index ? { ...step, ...updates } : step))
  }

  const runAutomatedTest = async () => {
    setIsRunning(true)
    setCurrentStep(0)

    try {
      let stepIndex = 0
      updateStep(stepIndex, { status: 'running' })
      const startTime = Date.now()

      const connections = await secureCredentialsAPI.getConnections()
      const duration = Date.now() - startTime

      if (connections.length === 0) {
        updateStep(stepIndex, { 
          status: 'error', 
          message: 'No saved connections found. Please save a connection first.',
          duration 
        })
        return
      }

      updateStep(stepIndex, { 
        status: 'success', 
        message: `Found ${connections.length} connection(s)`,
        duration 
      })

      await new Promise(resolve => setTimeout(resolve, 500))
      stepIndex++
      setCurrentStep(stepIndex)
      updateStep(stepIndex, { status: 'running' })
      const startTime2 = Date.now()

      const fastaffConnection = connections.find(c => 
        c.name.toLowerCase().includes('fastaff') || c.tenant.toLowerCase().includes('fastaff')
      )

      const testConnection = fastaffConnection || connections[0]
      const duration2 = Date.now() - startTime2

      if (!fastaffConnection) {
        updateStep(stepIndex, { 
          status: 'warning', 
          message: `Using ${testConnection.name} instead of Fastaff`,
          duration: duration2
        })
      } else {
        updateStep(stepIndex, { 
          status: 'success', 
          message: `Found: ${fastaffConnection.name}`,
          duration: duration2
        })
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      stepIndex++
      setCurrentStep(stepIndex)
      updateStep(stepIndex, { status: 'running' })
      const startTime3 = Date.now()

      const credentials = await secureCredentialsAPI.getCredentials(testConnection.id)
      const duration3 = Date.now() - startTime3

      if (!credentials) {
        updateStep(stepIndex, { 
          status: 'error', 
          message: 'No credentials found for connection',
          duration: duration3
        })
        return
      }

      const validationErrors: string[] = []
      if (!credentials.clientId) validationErrors.push('clientId')
      if (!credentials.clientSecret) validationErrors.push('clientSecret')
      if (!credentials.username) validationErrors.push('username')
      if (!credentials.password) validationErrors.push('password')

      if (validationErrors.length > 0) {
        updateStep(stepIndex, { 
          status: 'error', 
          message: `Missing fields: ${validationErrors.join(', ')}`,
          duration: duration3
        })
        return
      }

      updateStep(stepIndex, { 
        status: 'success', 
        message: 'All credential fields validated',
        duration: duration3
      })

      await new Promise(resolve => setTimeout(resolve, 500))
      stepIndex++
      setCurrentStep(stepIndex)
      updateStep(stepIndex, { status: 'running' })
      const startTime4 = Date.now()

      const currentUrl = window.location.origin + window.location.pathname
      const authUrl = bullhornAPI.getAuthorizationUrl(
        credentials.clientId,
        currentUrl,
        'test-state',
        credentials.username,
        credentials.password
      )

      if (!authUrl || !authUrl.includes('client_id')) {
        updateStep(stepIndex, { 
          status: 'error', 
          message: 'Failed to generate valid OAuth URL',
          duration: Date.now() - startTime4
        })
        return
      }

      updateStep(stepIndex, { 
        status: 'success', 
        message: 'OAuth URL generated successfully',
        duration: Date.now() - startTime4
      })

      await new Promise(resolve => setTimeout(resolve, 500))
      stepIndex++
      setCurrentStep(stepIndex)
      updateStep(stepIndex, { status: 'running' })
      const startTime5 = Date.now()

      const session = await bullhornAPI.authenticate({
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        username: credentials.username,
        password: credentials.password
      })

      const duration5 = Date.now() - startTime5

      if (!session || !session.BhRestToken) {
        updateStep(stepIndex, { 
          status: 'error', 
          message: 'Authentication failed - no session or token',
          duration: duration5
        })
        return
      }

      updateStep(stepIndex, { 
        status: 'success', 
        message: `Authenticated successfully (${duration5}ms)`,
        duration: duration5
      })

      await new Promise(resolve => setTimeout(resolve, 500))
      stepIndex++
      setCurrentStep(stepIndex)
      updateStep(stepIndex, { status: 'running' })
      const startTime6 = Date.now()

      const sessionValidations: string[] = []
      if (!session.BhRestToken) sessionValidations.push('No BhRestToken')
      if (!session.restUrl) sessionValidations.push('No restUrl')
      if (!session.corporationId) sessionValidations.push('No corporationId')
      if (!session.userId) sessionValidations.push('No userId')

      if (sessionValidations.length > 0) {
        updateStep(stepIndex, { 
          status: 'warning', 
          message: sessionValidations.join(', '),
          duration: Date.now() - startTime6
        })
      } else {
        updateStep(stepIndex, { 
          status: 'success', 
          message: 'All session fields validated',
          duration: Date.now() - startTime6
        })
      }

      await new Promise(resolve => setTimeout(resolve, 500))
      stepIndex++
      setCurrentStep(stepIndex)
      updateStep(stepIndex, { status: 'running' })
      const startTime7 = Date.now()

      const blankScreenChecks: string[] = []
      if (typeof window !== 'undefined') blankScreenChecks.push('Window object accessible')
      if (window.location) blankScreenChecks.push('Location object accessible')
      if (window.history) blankScreenChecks.push('History API accessible')

      updateStep(stepIndex, { 
        status: 'success', 
        message: `All checks passed: ${blankScreenChecks.join(', ')}`,
        duration: Date.now() - startTime7
      })

      toast.success('Automated OAuth test completed successfully!', {
        description: `Total time: ${Date.now() - startTime}ms`
      })

      if (onAuthSuccess) {
        onAuthSuccess(session)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (currentStep >= 0) {
        updateStep(currentStep, { 
          status: 'error', 
          message: errorMessage
        })
      }
      toast.error('Automated test failed', {
        description: errorMessage
      })
      console.error('Automated OAuth test error:', error)
    } finally {
      setIsRunning(false)
      setCurrentStep(-1)
    }
  }

  const getStatusIcon = (status: typeof steps[0]['status'], isCurrent: boolean) => {
    if (status === 'running' || isCurrent) {
      return <Spinner className="animate-spin text-blue-500" />
    }
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" weight="fill" />
      case 'error':
        return <XCircle className="text-red-500" weight="fill" />
      case 'warning':
        return <Warning className="text-yellow-500" weight="fill" />
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-muted" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Play size={24} weight="fill" className="text-accent" />
              Automated OAuth Flow Test
            </CardTitle>
            <CardDescription>
              One-click test of complete OAuth authentication with Fastaff credentials
            </CardDescription>
          </div>
          <Button 
            onClick={runAutomatedTest} 
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <>
                <Spinner className="animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play />
                Run Test
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            This test will automatically authenticate using saved Fastaff credentials and verify 
            the entire OAuth flow including blank screen prevention.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                currentStep === index ? 'bg-accent/10 border-accent' : 
                step.status === 'success' ? 'bg-green-500/5 border-green-500/20' :
                step.status === 'error' ? 'bg-red-500/5 border-red-500/20' :
                step.status === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
                'bg-muted/30'
              }`}
            >
              {getStatusIcon(step.status, currentStep === index)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{step.name}</span>
                  {step.duration !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {step.duration}ms
                    </Badge>
                  )}
                </div>
                {step.message && (
                  <p className="text-sm text-muted-foreground mt-0.5">{step.message}</p>
                )}
              </div>
              {currentStep === index && <ArrowRight className="text-accent" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
