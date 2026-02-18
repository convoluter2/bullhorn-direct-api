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
  const isPlatform429 = window.location.pathname === '/' && document.title.includes('429')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangleIcon />
          <AlertTitle>
            {isPlatform429 || is429Error ? 'Rate Limit Exceeded' : isNetworkError ? 'Network Error' : 'Runtime Error'}
          </AlertTitle>
          <AlertDescription>
            {isPlatform429
              ? 'The hosting platform is currently rate-limiting requests. This is a temporary platform restriction, not an issue with the application.'
              : is429Error 
              ? 'The application has exceeded its rate limit. Please wait a moment and try again.'
              : isNetworkError
              ? 'Unable to connect to the service. Please check your internet connection and try again.'
              : 'Something unexpected happened while running the application. The error details are shown below.'}
          </AlertDescription>
        </Alert>
        
        <div className="bg-card border rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">
            {isPlatform429 ? 'What does this mean?' : 'Error Details:'}
          </h3>
          {isPlatform429 ? (
            <div className="text-xs text-muted-foreground space-y-2">
              <p>The GitHub/Spark hosting platform has temporarily restricted access due to high traffic.</p>
              <p className="font-semibold">Solutions:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Wait 1-2 minutes and refresh the page</li>
                <li>Clear your browser cache and cookies</li>
                <li>Try accessing in an incognito/private window</li>
                <li>If the issue persists, the platform may be experiencing high load</li>
              </ul>
            </div>
          ) : (
            <pre className="text-xs text-destructive bg-muted/50 p-3 rounded border overflow-auto max-h-32">
              {error.message}
            </pre>
          )}
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full"
            variant="default"
          >
            <RefreshCwIcon />
            Refresh Page
          </Button>
          
          {!isPlatform429 && (
            <Button 
              onClick={resetErrorBoundary} 
              className="w-full"
              variant="outline"
            >
              Try Again Without Refresh
            </Button>
          )}
          
          {(is429Error || isPlatform429) && (
            <p className="text-xs text-center text-muted-foreground">
              Recommended: Wait 60-120 seconds before retrying
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
