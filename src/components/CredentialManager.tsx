import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileArrowDown, FileArrowUp, Certificate } from '@phosphor-icons/react'
import { CredentialBulkDownloader } from '@/components/CredentialBulkDownloader'
import { CredentialBulkUploader } from '@/components/CredentialBulkUploader'

interface CredentialManagerProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

export function CredentialManager({ onLog }: CredentialManagerProps) {
  const [activeTab, setActiveTab] = useState<'download' | 'upload'>('download')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Certificate size={32} weight="duotone" className="text-accent" />
            <div>
              <CardTitle>Credential Manager</CardTitle>
              <CardDescription>
                Bulk download and upload CandidateCertification records with associated files
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'download' | 'upload')} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="download" className="gap-2">
                <FileArrowDown size={18} />
                Bulk Download
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <FileArrowUp size={18} />
                Bulk Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="download" className="space-y-6">
              <CredentialBulkDownloader onLog={onLog} />
            </TabsContent>

            <TabsContent value="upload" className="space-y-6">
              <CredentialBulkUploader onLog={onLog} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
