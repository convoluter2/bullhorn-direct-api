import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard } from '@phosphor-icons/react'

interface RateCardBuilderProps {
  onLog: (operation: string, status: 'success' | 'error', message: string, details?: any) => void
}

export function RateCardBuilder({ onLog }: RateCardBuilderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CreditCard size={24} className="text-primary" weight="duotone" />
          <div>
            <CardTitle>Rate Card Builder</CardTitle>
            <CardDescription>
              Build and manage Bullhorn rate cards
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Alert>
          <AlertDescription>
            This component is currently being rebuilt. Please check back soon.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}