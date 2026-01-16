import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from '@phosphor-icons/react'

interface EntityHelpAlertProps {
  entity: string
}

export function EntityHelpAlert({ entity }: EntityHelpAlertProps) {
  if (entity === 'JobSubmission') {
    return (
      <Alert className="border-blue-500 bg-blue-500/10">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertDescription>
          <strong>JobSubmission Tips:</strong> The field <code className="text-xs bg-muted px-1 py-0.5 rounded">candidateSource</code> does not exist. 
          Use <code className="text-xs bg-muted px-1 py-0.5 rounded">candidate</code> to get the candidate ID, or 
          use <code className="text-xs bg-muted px-1 py-0.5 rounded">source</code> for the submission's source field.
          To access candidate details, expand the candidate field or query separately.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
