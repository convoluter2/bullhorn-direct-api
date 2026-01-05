import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export const ErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
  if (import.meta.env.DEV) throw error;

  const is429Error = error.message.includes('429') || error.message.toLowerCase().includes('rate limit')
  const isNetworkError = error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangleIcon />
          <AlertTitle>
            {is429Error ? 'Rate Limit Exceeded' : isNetworkError ? 'Network Error' : 'Runtime Error'}
          </AlertTitle>
          <AlertDescription>
            {is429Error 
              ? 'The application has exceeded its rate limit. Please wait a moment and try again.'
              : isNetworkError
              ? 'Unable to connect to the service. Please check your internet connection and try again.'
              : 'Something unexpected happened while running the application. The error details are shown below.'}
          </AlertDescription>
        </Alert>
        
        <div className="bg-card border rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">Error Details:</h3>
          <pre className="text-xs text-destructive bg-muted/50 p-3 rounded border overflow-auto max-h-32">
            {error.message}
          </pre>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={resetErrorBoundary} 
            className="w-full"
            variant="outline"
          >
            <RefreshCwIcon />
            Try Again
          </Button>
          
          {is429Error && (
            <p className="text-xs text-center text-muted-foreground">
              Recommended: Wait 60 seconds before retrying
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
