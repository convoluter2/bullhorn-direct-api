import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, Construction } from '@phosphor-icons/react'

interface RateCardBuilderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

export function RateCardBuilder({ onLog }: RateCardBuilderProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CreditCard size={28} className="text-accent" weight="duotone" />
            <div>
              <CardTitle>Rate Card Builder</CardTitle>
              <CardDescription>
                Manage Bullhorn rate cards and line items
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <Construction size={18} className="text-muted-foreground" />
            <AlertDescription>
              The Rate Card Builder is currently being rebuilt. This feature will be available soon.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
