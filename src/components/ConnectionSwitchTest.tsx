import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, XCircle, Warning, ArrowsLeftRight, Database, ShieldCheck, Trash } from '@phosphor-icons/react'
import { bullhornAPI } from '@/lib/bullhorn-api'
import { fieldValueCache } from '@/lib/field-value-cache'
import { entityCacheService } from '@/lib/entity-cache-service'
import { sessionManager } from '@/lib/session-manager'
import { toast } from 'sonner'
import type { BullhornSession } from '@/lib/types'

interface TestResult {
  testName: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

interface ConnectionSnapshot {
  connectionName: string
  corporationId: number | undefined
  restUrl: string
  tenant: string
  dataCenterId: number | null
  superClusterId: number | null
  browserId: string
  timestamp: number
  fieldCacheStats: {
    size: number
    entities: string[]
  }
  sampleSkillData?: any[]
  sampleCandidateData?: any[]
}

export function ConnectionSwitchTest() {
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [vistaSnapshot, setVistaSnapshot] = useState<ConnectionSnapshot | null>(null)
  const [trustaffSnapshot, setTrustaffSnapshot] = useState<ConnectionSnapshot | null>(null)
  const [currentSnapshot, setCurrentSnapshot] = useState<ConnectionSnapshot | null>(null)

  const captureConnectionSnapshot = async (connectionName: string): Promise<ConnectionSnapshot> => {
    const session = bullhornAPI.getSession()
    const dcInfo = bullhornAPI.getDatacenterInfo()
    const cacheStats = fieldValueCache.getCacheStats()
    
    let sampleSkillData: any[] = []
    let sampleCandidateData: any[] = []
    
    try {
      const skills = await bullhornAPI.query('Skill', 'id>0', 'id,name', { count: 5, orderBy: 'id' })
      sampleSkillData = skills.data || []
    } catch (error) {
      console.warn('Could not fetch sample skills:', error)
    }
    
    try {
      const candidates = await bullhornAPI.query('Candidate', 'id>0', 'id,firstName,lastName', { count: 5, orderBy: 'id' })
      sampleCandidateData = candidates.data || []
    } catch (error) {
      console.warn('Could not fetch sample candidates:', error)
    }

    const snapshot: ConnectionSnapshot = {
      connectionName,
      corporationId: session?.corporationId,
      restUrl: session?.restUrl || '',
      tenant: session?.restUrl?.match(/rest-services\/([^/]+)/)?.[1] || '',
      dataCenterId: dcInfo.dataCenterId,
      superClusterId: dcInfo.superClusterId,
      browserId: sessionManager.getBrowserId(),
      timestamp: Date.now(),
      fieldCacheStats: {
        size: cacheStats.size,
        entities: cacheStats.entities
      },
      sampleSkillData,
      sampleCandidateData
    }

    return snapshot
  }

  const addTestResult = (testName: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) => {
    setTestResults(prev => [...prev, { testName, status, message, details }])
  }

  const runConnectionSwitchTest = async () => {
    setIsRunning(true)
    setTestResults([])
    setVistaSnapshot(null)
    setTrustaffSnapshot(null)
    setCurrentSnapshot(null)

    try {
      const currentSession = bullhornAPI.getSession()
      if (!currentSession) {
        addTestResult('Pre-Test Check', 'fail', 'No active session. Please connect first.')
        setIsRunning(false)
        return
      }

      addTestResult('Pre-Test Check', 'pass', 'Active session detected', {
        corporationId: currentSession.corporationId,
        restUrl: currentSession.restUrl
      })

      const initialSnapshot = await captureConnectionSnapshot('Initial Connection')
      setCurrentSnapshot(initialSnapshot)
      
      addTestResult('Initial State Capture', 'pass', `Captured state for ${initialSnapshot.connectionName}`, {
        corporationId: initialSnapshot.corporationId,
        tenant: initialSnapshot.tenant,
        cacheSize: initialSnapshot.fieldCacheStats.size,
        dataCenterId: initialSnapshot.dataCenterId,
        superClusterId: initialSnapshot.superClusterId
      })

      if (initialSnapshot.tenant.toLowerCase().includes('vistavital') || 
          initialSnapshot.connectionName.toLowerCase().includes('vistavital')) {
        setVistaSnapshot(initialSnapshot)
        addTestResult('Connection Identification', 'pass', 'Detected VistaVital as initial connection')
      } else if (initialSnapshot.tenant.toLowerCase().includes('trustaff') || 
                 initialSnapshot.connectionName.toLowerCase().includes('trustaff')) {
        setTrustaffSnapshot(initialSnapshot)
        addTestResult('Connection Identification', 'pass', 'Detected TruStaff as initial connection')
      } else {
        addTestResult('Connection Identification', 'warning', `Unknown tenant: ${initialSnapshot.tenant}`)
      }

      addTestResult('Manual Action Required', 'warning', 
        'Please switch to the other connection now (VistaVital ↔ TruStaff) and click "Verify Switch" button below',
        { currentTenant: initialSnapshot.tenant }
      )

    } catch (error) {
      addTestResult('Test Execution', 'fail', `Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsRunning(false)
    }
  }

  const verifySwitchCompletion = async () => {
    setIsRunning(true)

    try {
      const newSession = bullhornAPI.getSession()
      if (!newSession) {
        addTestResult('Post-Switch Check', 'fail', 'No session after switch. Connection may have been lost.')
        setIsRunning(false)
        return
      }

      const postSwitchSnapshot = await captureConnectionSnapshot('Post-Switch Connection')
      
      if (!currentSnapshot) {
        addTestResult('Post-Switch Check', 'fail', 'No initial snapshot to compare against')
        setIsRunning(false)
        return
      }

      addTestResult('Post-Switch State Capture', 'pass', `Captured state for ${postSwitchSnapshot.connectionName}`, {
        corporationId: postSwitchSnapshot.corporationId,
        tenant: postSwitchSnapshot.tenant,
        cacheSize: postSwitchSnapshot.fieldCacheStats.size
      })

      if (postSwitchSnapshot.tenant.toLowerCase().includes('vistavital') || 
          postSwitchSnapshot.connectionName.toLowerCase().includes('vistavital')) {
        if (!vistaSnapshot) {
          setVistaSnapshot(postSwitchSnapshot)
        }
      } else if (postSwitchSnapshot.tenant.toLowerCase().includes('trustaff') || 
                 postSwitchSnapshot.connectionName.toLowerCase().includes('trustaff')) {
        if (!trustaffSnapshot) {
          setTrustaffSnapshot(postSwitchSnapshot)
        }
      }

      if (postSwitchSnapshot.corporationId === currentSnapshot.corporationId) {
        addTestResult('Corporation ID Change', 'fail', 
          'Corporation ID did not change! This indicates the connection was not actually switched.',
          { 
            before: currentSnapshot.corporationId, 
            after: postSwitchSnapshot.corporationId 
          }
        )
      } else {
        addTestResult('Corporation ID Change', 'pass', 
          'Corporation ID changed correctly',
          { 
            before: currentSnapshot.corporationId, 
            after: postSwitchSnapshot.corporationId 
          }
        )
      }

      if (postSwitchSnapshot.tenant === currentSnapshot.tenant) {
        addTestResult('Tenant Change', 'fail', 
          'Tenant did not change! Connection switch may have failed.',
          { 
            before: currentSnapshot.tenant, 
            after: postSwitchSnapshot.tenant 
          }
        )
      } else {
        addTestResult('Tenant Change', 'pass', 
          'Tenant changed correctly',
          { 
            before: currentSnapshot.tenant, 
            after: postSwitchSnapshot.tenant 
          }
        )
      }

      if (postSwitchSnapshot.dataCenterId === currentSnapshot.dataCenterId &&
          postSwitchSnapshot.superClusterId === currentSnapshot.superClusterId) {
        addTestResult('Datacenter Info', 'warning', 
          'Datacenter and SuperCluster IDs are the same (this may be normal if both connections are in the same region)',
          { 
            before: { dc: currentSnapshot.dataCenterId, sc: currentSnapshot.superClusterId },
            after: { dc: postSwitchSnapshot.dataCenterId, sc: postSwitchSnapshot.superClusterId }
          }
        )
      } else {
        addTestResult('Datacenter Info', 'pass', 
          'Datacenter/SuperCluster info differs between connections',
          { 
            before: { dc: currentSnapshot.dataCenterId, sc: currentSnapshot.superClusterId },
            after: { dc: postSwitchSnapshot.dataCenterId, sc: postSwitchSnapshot.superClusterId }
          }
        )
      }

      const hasSampleDataOverlap = postSwitchSnapshot.sampleSkillData?.some(skill => 
        currentSnapshot.sampleSkillData?.some(oldSkill => oldSkill.id === skill.id)
      )

      if (hasSampleDataOverlap) {
        addTestResult('Data Isolation - Skills', 'fail', 
          'CRITICAL: Skill data overlaps between connections! This indicates data bleed.',
          { 
            beforeSample: currentSnapshot.sampleSkillData?.slice(0, 3),
            afterSample: postSwitchSnapshot.sampleSkillData?.slice(0, 3)
          }
        )
      } else {
        addTestResult('Data Isolation - Skills', 'pass', 
          'No skill data overlap detected. Data is properly isolated.',
          { 
            beforeCount: currentSnapshot.sampleSkillData?.length || 0,
            afterCount: postSwitchSnapshot.sampleSkillData?.length || 0
          }
        )
      }

      const hasCandidateOverlap = postSwitchSnapshot.sampleCandidateData?.some(cand => 
        currentSnapshot.sampleCandidateData?.some(oldCand => oldCand.id === cand.id)
      )

      if (hasCandidateOverlap) {
        addTestResult('Data Isolation - Candidates', 'fail', 
          'CRITICAL: Candidate data overlaps between connections! This indicates data bleed.',
          { 
            beforeSample: currentSnapshot.sampleCandidateData?.slice(0, 3),
            afterSample: postSwitchSnapshot.sampleCandidateData?.slice(0, 3)
          }
        )
      } else {
        addTestResult('Data Isolation - Candidates', 'pass', 
          'No candidate data overlap detected. Data is properly isolated.',
          { 
            beforeCount: currentSnapshot.sampleCandidateData?.length || 0,
            afterCount: postSwitchSnapshot.sampleCandidateData?.length || 0
          }
        )
      }

      const cacheStatsOverlap = postSwitchSnapshot.fieldCacheStats.entities.some(entity =>
        currentSnapshot.fieldCacheStats.entities.includes(entity)
      )

      if (cacheStatsOverlap && postSwitchSnapshot.fieldCacheStats.size > 0 && currentSnapshot.fieldCacheStats.size > 0) {
        addTestResult('Cache Clearing', 'warning', 
          'Cache was not fully cleared on switch. Some entity caches may still exist.',
          { 
            beforeEntities: currentSnapshot.fieldCacheStats.entities,
            afterEntities: postSwitchSnapshot.fieldCacheStats.entities
          }
        )
      } else if (postSwitchSnapshot.fieldCacheStats.size === 0) {
        addTestResult('Cache Clearing', 'pass', 
          'Field value cache was completely cleared on switch.'
        )
      } else {
        addTestResult('Cache Clearing', 'pass', 
          'Cache entities are different, indicating proper cache isolation.'
        )
      }

      setCurrentSnapshot(postSwitchSnapshot)
      
      const passCount = testResults.filter(r => r.status === 'pass').length + 1
      const failCount = testResults.filter(r => r.status === 'fail').length
      
      if (failCount === 0) {
        toast.success(`Connection switch verified! ${passCount} checks passed.`)
      } else {
        toast.error(`Connection switch has issues! ${failCount} checks failed.`)
      }

    } catch (error) {
      addTestResult('Verification', 'fail', `Error: ${error instanceof Error ? error.message : String(error)}`)
      toast.error('Verification failed')
    } finally {
      setIsRunning(false)
    }
  }

  const clearAllCaches = async () => {
    try {
      toast.loading('Clearing all caches...', { id: 'clear-cache' })
      
      fieldValueCache.invalidateAll()
      await entityCacheService.clearAllCaches()
      
      toast.success('All caches cleared successfully', { id: 'clear-cache' })
      addTestResult('Manual Cache Clear', 'pass', 'All caches cleared manually')
    } catch (error) {
      toast.error('Failed to clear caches', { id: 'clear-cache' })
      addTestResult('Manual Cache Clear', 'fail', `Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const getStatusIcon = (status: 'pass' | 'fail' | 'warning') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="text-green-500" size={20} weight="fill" />
      case 'fail':
        return <XCircle className="text-red-500" size={20} weight="fill" />
      case 'warning':
        return <Warning className="text-yellow-500" size={20} weight="fill" />
    }
  }

  const passCount = testResults.filter(r => r.status === 'pass').length
  const failCount = testResults.filter(r => r.status === 'fail').length
  const warningCount = testResults.filter(r => r.status === 'warning').length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowsLeftRight className="text-accent" size={24} weight="duotone" />
                Connection Switch Data Bleed Test
              </CardTitle>
              <CardDescription>
                Verify that switching between VistaVital and TruStaff connections properly isolates data with no bleed-through
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={clearAllCaches}
                variant="outline"
                size="sm"
                disabled={isRunning}
              >
                <Trash size={16} />
                Clear All Caches
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Test Instructions</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Connect to either VistaVital or TruStaff (whichever you're currently on)</li>
                <li>Click "Start Test" to capture initial state</li>
                <li>Use the connection switcher to switch to the OTHER connection</li>
                <li>Click "Verify Switch" to validate data isolation</li>
                <li>Review test results below for any data bleed issues</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={runConnectionSwitchTest}
              disabled={isRunning}
              className="flex-1"
            >
              <Database size={18} />
              Start Test
            </Button>
            <Button
              onClick={verifySwitchCompletion}
              disabled={isRunning || !currentSnapshot}
              variant="secondary"
              className="flex-1"
            >
              <CheckCircle size={18} />
              Verify Switch
            </Button>
          </div>

          {(passCount > 0 || failCount > 0 || warningCount > 0) && (
            <div className="flex gap-2">
              {passCount > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {passCount} Passed
                </Badge>
              )}
              {failCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {failCount} Failed
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  {warningCount} Warnings
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(vistaSnapshot || trustaffSnapshot || currentSnapshot) && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Snapshots</CardTitle>
            <CardDescription>Captured state of each connection for comparison</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {vistaSnapshot && (
              <div>
                <h4 className="font-semibold mb-2">VistaVital Snapshot</h4>
                <div className="bg-muted p-3 rounded-md font-mono text-sm space-y-1">
                  <div>Corp ID: {vistaSnapshot.corporationId}</div>
                  <div>Tenant: {vistaSnapshot.tenant}</div>
                  <div>DC: {vistaSnapshot.dataCenterId} / SC: {vistaSnapshot.superClusterId}</div>
                  <div>Cache Size: {vistaSnapshot.fieldCacheStats.size}</div>
                  <div>Sample Skills: {vistaSnapshot.sampleSkillData?.length || 0}</div>
                  <div>Sample Candidates: {vistaSnapshot.sampleCandidateData?.length || 0}</div>
                </div>
              </div>
            )}
            {trustaffSnapshot && (
              <div>
                <h4 className="font-semibold mb-2">TruStaff Snapshot</h4>
                <div className="bg-muted p-3 rounded-md font-mono text-sm space-y-1">
                  <div>Corp ID: {trustaffSnapshot.corporationId}</div>
                  <div>Tenant: {trustaffSnapshot.tenant}</div>
                  <div>DC: {trustaffSnapshot.dataCenterId} / SC: {trustaffSnapshot.superClusterId}</div>
                  <div>Cache Size: {trustaffSnapshot.fieldCacheStats.size}</div>
                  <div>Sample Skills: {trustaffSnapshot.sampleSkillData?.length || 0}</div>
                  <div>Sample Candidates: {trustaffSnapshot.sampleCandidateData?.length || 0}</div>
                </div>
              </div>
            )}
            {currentSnapshot && !vistaSnapshot && !trustaffSnapshot && (
              <div>
                <h4 className="font-semibold mb-2">Current Snapshot</h4>
                <div className="bg-muted p-3 rounded-md font-mono text-sm space-y-1">
                  <div>Corp ID: {currentSnapshot.corporationId}</div>
                  <div>Tenant: {currentSnapshot.tenant}</div>
                  <div>DC: {currentSnapshot.dataCenterId} / SC: {currentSnapshot.superClusterId}</div>
                  <div>Cache Size: {currentSnapshot.fieldCacheStats.size}</div>
                  <div>Sample Skills: {currentSnapshot.sampleSkillData?.length || 0}</div>
                  <div>Sample Candidates: {currentSnapshot.sampleCandidateData?.length || 0}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Detailed results of connection switch validation</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{getStatusIcon(result.status)}</TableCell>
                    <TableCell className="font-medium">{result.testName}</TableCell>
                    <TableCell>{result.message}</TableCell>
                    <TableCell className="text-right text-xs">
                      {result.details && (
                        <details className="cursor-pointer">
                          <summary className="text-muted-foreground hover:text-foreground">
                            View Details
                          </summary>
                          <pre className="mt-2 text-left bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
