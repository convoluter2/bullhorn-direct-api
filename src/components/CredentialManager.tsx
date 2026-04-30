import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CredentialBulkDownloader } from '@/components/CredentialBulkDownloader'
import { CredentialBulkUploader } from '@/components/CredentialBulkUploader'
import { FileArrowDown, FileArrowUp, Certificate } from '@phosphor-icons/react'

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
            <Certificate size={24} weight="duotone" className="text-primary" />
            <div>
              <CardTitle>Credential Manager</CardTitle>
              <CardDescription>
                Bulk download or upload credentials securely
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'download' | 'upload')}>
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
