import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Copy, Check } from '@phosphor-icons/react'

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
}

export function CodeBlock({ code, language = 'bash', title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="relative group">
      {title && (
        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          {title}
        </div>
      )}
      <div className="relative bg-card border border-border rounded-lg overflow-hidden">
        <div className="absolute top-2 right-2 z-10">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? (
              <Check className="text-green-400" size={16} />
            ) : (
              <Copy size={16} />
            )}
          </Button>
        </div>
        <pre className="p-4 overflow-x-auto text-sm">
          <code className={`language-${language} font-mono`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  )
}
