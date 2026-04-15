import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
interface RateCardBuilderProps {

export function RateCardBuilder(
    <Card>
 

export function RateCardBuilder({ onLog }: RateCardBuilderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <CreditCard size={24} className="text-primary" weight="duotone" />
          <div>
            <CardTitle>Rate Card Builder</CardTitle>
          <AlertDescription>
              Build and manage Bullhorn rate cards
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Alert>

            This component is currently being rebuilt. Please check back soon.

        </Alert>
      </CardContent>
    </Card>

}
