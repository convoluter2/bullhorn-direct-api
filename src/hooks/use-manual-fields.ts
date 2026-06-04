import { useKV } from '@github/spark/hooks'
import { useCallback, useMemo } from 'react'
import type { ManualFieldDefinition } from '@/components/ManualFieldDialog'
import type { EntityField } from './use-entity-metadata'

type ManualFieldsStore = Record<string, ManualFieldDefinition[]>

export function useManualFields(entity?: string) {
  const [manualFieldsStore, setManualFieldsStore] = useKV<ManualFieldsStore>('manual-fields-store', {})

  const manualFields = useMemo(() => {
    if (!entity) return []
    return manualFieldsStore[entity] || []
  }, [entity, manualFieldsStore])

  const addManualField = useCallback((entityName: string, field: ManualFieldDefinition) => {
    setManualFieldsStore((current) => {
      const entityFields = current[entityName] || []
      
      const exists = entityFields.some(f => f.name === field.name)
      if (exists) {
        return current
      }

      return {
        ...current,
        [entityName]: [...entityFields, field]
      }
    })
  }, [setManualFieldsStore])

  const removeManualField = useCallback((entityName: string, fieldName: string) => {
    setManualFieldsStore((current) => {
      const entityFields = current[entityName] || []
      const filtered = entityFields.filter(f => f.name !== fieldName)
      
      if (filtered.length === 0) {
        const { [entityName]: _, ...rest } = current
        return rest
      }

      return {
        ...current,
        [entityName]: filtered
      }
    })
  }, [setManualFieldsStore])

  const updateManualField = useCallback((entityName: string, fieldName: string, updates: Partial<ManualFieldDefinition>) => {
    setManualFieldsStore((current) => {
      const entityFields = current[entityName] || []
      const updated = entityFields.map(f => 
        f.name === fieldName ? { ...f, ...updates } : f
      )

      return {
        ...current,
        [entityName]: updated
      }
    })
  }, [setManualFieldsStore])

  const convertToEntityField = useCallback((manual: ManualFieldDefinition): EntityField => {
    const base: EntityField = {
      name: manual.name,
      label: manual.label,
      type: manual.type,
      dataType: manual.dataType,
      optional: manual.optional,
    }

    if (manual.type === 'TO_ONE') {
      base.associationType = 'TO_ONE'
      if (manual.associatedEntity) {
        base.associatedEntity = {
          entity: manual.associatedEntity,
          entityMetaUrl: `meta/${manual.associatedEntity}?fields=*`
        }
      }
    } else if (manual.type === 'TO_MANY') {
      base.associationType = 'TO_MANY'
      if (manual.associatedEntity) {
        base.associatedEntity = {
          entity: manual.associatedEntity,
          entityMetaUrl: `meta/${manual.associatedEntity}?fields=*`
        }
      }
    }

    return base
  }, [])

  const getEnrichedFields = useCallback((apiFields: EntityField[]): EntityField[] => {
    if (!entity) return apiFields

    const manualFieldsForEntity = manualFieldsStore[entity] || []
    const manualEntityFields = manualFieldsForEntity.map(convertToEntityField)

    const apiFieldNames = new Set(apiFields.map(f => f.name))
    const uniqueManualFields = manualEntityFields.filter(f => !apiFieldNames.has(f.name))

    return [...apiFields, ...uniqueManualFields]
  }, [entity, manualFieldsStore, convertToEntityField])

  const getAllManualFields = useCallback(() => {
    return manualFieldsStore
  }, [manualFieldsStore])

  const clearManualFieldsForEntity = useCallback((entityName: string) => {
    setManualFieldsStore((current) => {
      const { [entityName]: _, ...rest } = current
      return rest
    })
  }, [setManualFieldsStore])

  return {
    manualFields,
    addManualField,
    removeManualField,
    updateManualField,
    convertToEntityField,
    getEnrichedFields,
    getAllManualFields,
    clearManualFieldsForEntity
  }
}
