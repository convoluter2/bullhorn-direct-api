import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FloppyDisk, FolderOpen, Trash, FileText, Calendar, Database, Check } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { CSVMapping } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'

export interface FieldMappingTemplate {
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
  onApplyTemplate: (template: FieldMappingTemplate) => void
}

export function FieldMappingTemplates({ currentEntity, currentMappings, onApplyTemplate }: FieldMappingTemplatesProps) {
  const [templates, setTemplates] = useKV<FieldMappingTemplate[]>('field-mapping-templates', [])
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

    const validMappings = currentMappings.filter(m => 
      m && m.csvColumn && m.bullhornField && m.bullhornField !== '__skip__'
    )

    if (validMappings.length === 0) {
      toast.error('No valid field mappings to save')
      return
    }

    const newTemplate: FieldMappingTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: templateName.trim(),
      description: templateDescription.trim() || undefined,
      entity: currentEntity,
      mappings: validMappings,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0
    }

    setTemplates((current) => [...(current || []), newTemplate])

    toast.success(`Template "${templateName}" saved successfully`)
    
    setTemplateName('')
    setTemplateDescription('')
    setSaveDialogOpen(false)
  }

  const handleLoadTemplate = (template: FieldMappingTemplate) => {
    if (template.entity !== currentEntity) {
      toast.error(`This template is for ${template.entity}, but you have ${currentEntity} selected`)
      return
    }

    const updatedTemplate = {
      ...template,
      usageCount: template.usageCount + 1,
      updatedAt: Date.now()
    }

    setTemplates((current) => 
      (current || []).map(t => t.id === template.id ? updatedTemplate : t)
    )

    onApplyTemplate(updatedTemplate)
    setLoadDialogOpen(false)
    
    toast.success(`Applied template: ${template.name}`)
  }

  const handleDeleteTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id === templateId)
    
    if (!template) return

    if (confirm(`Delete template "${template.name}"?`)) {
      setTemplates((current) => (current || []).filter(t => t.id !== templateId))
      toast.success('Template deleted')
    }
  }

  const entityTemplates = (templates || []).filter(t => t.entity === currentEntity)
  const allTemplates = templates || []

  const hasValidMappings = currentMappings.some(m => 
    m && m.csvColumn && m.bullhornField && m.bullhornField !== '__skip__'
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
            <FloppyDisk size={16} />
            Save Template
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save Field Mapping Template</DialogTitle>
            <DialogDescription>
              Save the current field mappings as a reusable template for {currentEntity}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="e.g., Standard Candidate Import"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveTemplate()
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Input
                id="template-description"
                placeholder="e.g., Maps standard CSV export to Candidate fields"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>

            <Alert>
              <Check size={16} />
              <AlertDescription>
                Saving {currentMappings.filter(m => m && m.csvColumn && m.bullhornField && m.bullhornField !== '__skip__').length} field mapping{currentMappings.filter(m => m && m.csvColumn && m.bullhornField && m.bullhornField !== '__skip__').length !== 1 ? 's' : ''} for {currentEntity}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              <FloppyDisk size={16} />
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            disabled={!currentEntity}
          >
            <FolderOpen size={16} />
            Load Template
            {entityTemplates.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {entityTemplates.length}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load Field Mapping Template</DialogTitle>
            <DialogDescription>
              Select a saved template to apply field mappings
            </DialogDescription>
          </DialogHeader>

          {allTemplates.length === 0 ? (
            <div className="py-12 text-center">
              <FileText size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-2">No templates saved yet</p>
              <p className="text-sm text-muted-foreground">
                Save your current field mappings to reuse them later
              </p>
            </div>
          ) : entityTemplates.length === 0 ? (
            <div className="space-y-4">
              <Alert>
                <Database size={16} />
                <AlertDescription>
                  No templates found for {currentEntity}. Showing templates for other entities:
                </AlertDescription>
              </Alert>
              
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {allTemplates.map(template => (
                    <Card key={template.id} className="border-muted">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base flex items-center gap-2">
                              {template.name}
                              <Badge variant="outline" className="font-normal">
                                {template.entity}
                              </Badge>
                            </CardTitle>
                            {template.description && (
                              <CardDescription className="mt-1 text-sm">
                                {template.description}
                              </CardDescription>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm space-y-1 text-muted-foreground">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span>{template.mappings.length} field{template.mappings.length !== 1 ? 's' : ''}</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {formatDistanceToNow(template.createdAt, { addSuffix: true })}
                          </span>
                          <span>Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {entityTemplates.map(template => (
                  <Card 
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleLoadTemplate(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base flex items-center gap-2">
                            {template.name}
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1 text-sm">
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
                          <Trash size={16} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex items-center gap-4 flex-wrap text-muted-foreground">
                        <span>{template.mappings.length} field{template.mappings.length !== 1 ? 's' : ''}</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDistanceToNow(template.createdAt, { addSuffix: true })}
                        </span>
                        <span>Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground mb-2">Field Mappings:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.mappings.slice(0, 5).map((mapping, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs font-mono">
                              {mapping.csvColumn} → {mapping.bullhornField}
                            </Badge>
                          ))}
                          {template.mappings.length > 5 && (
                            <Badge variant="outline" className="text-xs">
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
