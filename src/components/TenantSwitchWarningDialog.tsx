import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Warning, BrowserChrome } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface TenantSwitchWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: () => void
  connectionName: string
  tenant: string
  environment: 'NPE' | 'PROD'
}

export function TenantSwitchWarningDialog({
  open,
  onOpenChange,
  onContinue,
  connectionName,
  tenant,
  environment,
}: TenantSwitchWarningDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const STORAGE_KEY = 'bullhorn-tenant-switch-warning-dismissed'

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed === 'true' && open) {
      onContinue()
      onOpenChange(false)
    }
  }, [open, onContinue, onOpenChange])

  const handleContinue = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    onContinue()
    onOpenChange(false)
  }

  const handleOpenIncognito = () => {
    const url = window.location.href
    toast.info('Opening new private window - please authenticate there', {
      description: 'Your connection URL has been copied to clipboard',
    })
    
    navigator.clipboard.writeText(url).catch(err => {
      console.warn('Failed to copy URL:', err)
    })

    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600">
            <Warning size={24} weight="fill" />
            Bullhorn OAuth Browser Cache Warning
          </DialogTitle>
          <DialogDescription>
            Important information about switching Bullhorn tenants
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <BrowserChrome className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Bullhorn may reuse browser login cookies across tenants.</strong>
              {' '}If you've recently authenticated to a different tenant in this browser,
              Bullhorn OAuth may silently return credentials for that tenant instead of{' '}
              <strong>{connectionName}</strong>.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">You are connecting to:</p>
            <div className="bg-muted p-3 rounded-md space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connection:</span>
                <span className="font-mono font-semibold">{connectionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Environment:</span>
                <span className="font-mono">{environment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tenant:</span>
                <span className="font-mono">{tenant}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Recommended actions:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
              <li>If this is your <strong>primary tenant</strong>, continue normally</li>
              <li>If switching tenants, use a <strong>private/incognito window</strong></li>
              <li>Clear browser cookies if you experience authentication issues</li>
            </ul>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label
              htmlFor="dont-show-again"
              className="text-sm font-normal cursor-pointer"
            >
              Don't show this warning again
            </Label>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleOpenIncognito}
            className="w-full sm:w-auto"
          >
            <BrowserChrome className="mr-2" size={16} />
            Open in Private Window
          </Button>
          <Button
            onClick={handleContinue}
            className="w-full sm:w-auto"
          >
            Continue Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function shouldShowTenantWarning(): boolean {
  const STORAGE_KEY = 'bullhorn-tenant-switch-warning-dismissed'
  return localStorage.getItem(STORAGE_KEY) !== 'true'
}

export function resetTenantWarning(): void {
  const STORAGE_KEY = 'bullhorn-tenant-switch-warning-dismissed'
  localStorage.removeItem(STORAGE_KEY)
}
