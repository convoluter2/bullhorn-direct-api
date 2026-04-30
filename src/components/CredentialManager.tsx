import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CredentialBulkDownloader } from '@/components/CredentialBulkDownloader
import { FileArrowDown, FileArrowUp, Certificate } from '@phosphor-icons/react'
  onLog: (operation: string, status: 'success' | 'error', message: string, detai
import { CredentialBulkUploader } from '@/components/CredentialBulkUploader'

  const [activeTab, setActiveTab] 
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

export function CredentialManager({ onLog }: CredentialManagerProps) {
  const [activeTab, setActiveTab] = useState<'download' | 'upload'>('download')

  return (
            <TabsList className
            
              </Tabs
                <FileArrowUp size={18} />
              </TabsTrigger>

              <CredentialBulkDownloader onLog={onLog} /

              <CredentialBulkUploader onLog={onLog} />
          </Tabs>
      </Card>
  )




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
