import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { FloppyDisk, FolderOpen, Trash, FileText } from '@phosphor-icons/react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import type { CSVMapping } from '@/lib/types'

interface MappingTemplate {
  id: string
  name: string
  description?: string
  entity: string
  mappings: CSVMapping[]
  createdAt: number
  updatedAt: number
  usageCount: number
}

interface FieldMappingTemplatesProps {
  currentEntity: string
  currentMappings: CSVMapping[]
  onLoadTemplate: (template: MappingTemplate) => void
}

export function FieldMappingTemplates({ currentEntity, currentMappings, onLoadTemplate }: FieldMappingTemplatesProps) {
  const [templates, setTemplates] = useKV<MappingTemplate[]>('field-mapping-templates', [])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadDialogOpen, setLoadDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name')
      return
    }

    if (!currentEntity) {
      toast.error('Please select an entity first')
      return
    }

    const validMappings = currentMappings.filter(
      m => m.csvColumn && m.bullhornField
    )

    if (validMappings.length === 0) {
      toast.error('Please create at least one field mapping')
      return
    }

    const newTemplate: MappingTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      entity: currentEntity,
      mappings: validMappings,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0,
    }

    setTemplates((current) => [...(current || []), newTemplate])
    toast.success(`Template "${templateName}" saved successfully`)
    setTemplateName('')
    setTemplateDescription('')
    setSaveDialogOpen(false)
  }

  const handleLoadTemplate = (template: MappingTemplate) => {
    setTemplates((current) =>
      (current || []).map(t =>
        t.id === template.id
          ? { ...t, usageCount: (t.usageCount || 0) + 1, updatedAt: Date.now() }
          : t
      )
    )
    onLoadTemplate(template)
    setLoadDialogOpen(false)
    toast.success(`Template "${template.name}" loaded`)
  }

  const handleDeleteTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId)
    if (!template) return
    if (confirm(`Delete template "${template.name}"?`)) {
      setTemplates((current) => (current || []).filter(t => t.id !== templateId))
      toast.success('Template deleted')
    }
  }

  const allTemplates = templates || []
  const entityTemplates = allTemplates.filter(t => t.entity === currentEntity)

  const hasValidMappings = currentMappings.some(
    m => m && m.csvColumn && m.bullhornField
  )

  return (
    <div className="flex items-center gap-2">
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!currentEntity || !hasValidMappings}
          >
            <FloppyDisk />
            Save Template
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Field Mapping Template</DialogTitle>
            <DialogDescription>
              Save the current field mappings as a reusable template
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Standard Candidate Import"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description (optional)</Label>
              <Textarea
                id="template-description"
                placeholder="Describe what this template is for..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>
            <Alert>
              <AlertDescription>
                This template will save {currentMappings.filter(m => m.csvColumn && m.bullhornField).length} field mappings for the {currentEntity} entity.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              <FloppyDisk />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FolderOpen />
            Load Template
            {allTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {allTemplates.length}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Load Field Mapping Template</DialogTitle>
            <DialogDescription>
              Select a saved template to apply field mappings
            </DialogDescription>
          </DialogHeader>
          {allTemplates.length === 0 ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                No saved templates yet. Create your first template by mapping fields and clicking "Save Template".
              </AlertDescription>
            </Alert>
          ) : entityTemplates.length === 0 ? (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                No templates found for the {currentEntity} entity. You have {allTemplates.length} template(s) for other entities.
              </AlertDescription>
            </Alert>
          ) : (
            <ScrollArea className="max-h-[500px] pr-4">
              <div className="space-y-3">
                {entityTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleLoadTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            {template.name}
                            <Badge variant="outline" className="font-mono text-xs">
                              {template.entity}
                            </Badge>
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTemplate(template.id)
                          }}
                        >
                          <Trash className="text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText size={14} />
                          {template.mappings.length} fields
                        </span>
                        <span className="flex items-center gap-1">
                          {formatDistanceToNow(template.createdAt, { addSuffix: true })}
                        </span>
                        <span>Used {template.usageCount || 0} time{(template.usageCount || 0) !== 1 ? 's' : ''}</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Field mappings:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.mappings.slice(0, 5).map((mapping, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs font-mono">
                              {mapping.csvColumn} → {mapping.bullhornField}
                            </Badge>
                          ))}
                          {template.mappings.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.mappings.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
