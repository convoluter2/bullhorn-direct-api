import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, Ca
import { FileArrowDown, FileArrowUp, Certificate } from '@phosphor-icons/react'
import { CredentialBulkUploader } from '@/components/CredentialBulkUploader'
interface CredentialManagerProps {
}
export function CredentialManager({ onLog }: CredentialManagerProps) {

interface CredentialManagerProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

export function CredentialManager({ onLog }: CredentialManagerProps) {
  const [activeTab, setActiveTab] = useState<'download' | 'upload'>('download')

  return (
              <TabsTrigger valu
            
              <TabsT
                Bulk Upload
            </TabsList>
            <Tabs
            </TabsContent>
            <TabsContent value=
            </TabsContent>
        </CardContent>
    </div>
}




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
