import type { ConditionalRule, ConditionalAssociation } from '@/components/ConditionalAssociationBuilder'

export function evaluateCondition(rule: ConditionalRule, recordData: Record<string, any>): boolean {
  const fieldValue = recordData[rule.field]
  const ruleValue = rule.value

  switch (rule.operator) {
    case 'equals':
      return String(fieldValue) === String(ruleValue)

    case 'notEquals':
      return String(fieldValue) !== String(ruleValue)

    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase())

    case 'notContains':
      return !String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase())

    case 'greaterThan':
      return Number(fieldValue) > Number(ruleValue)

    case 'lessThan':
      return Number(fieldValue) < Number(ruleValue)

    case 'isEmpty':
      return fieldValue === null || fieldValue === undefined || String(fieldValue).trim() === ''

    case 'isNotEmpty':
      return fieldValue !== null && fieldValue !== undefined && String(fieldValue).trim() !== ''

    case 'in': {
      const listValues = ruleValue.split(',').map(v => v.trim().toLowerCase())
      return listValues.includes(String(fieldValue).toLowerCase())
    }

    case 'notIn': {
      const listValues = ruleValue.split(',').map(v => v.trim().toLowerCase())
      return !listValues.includes(String(fieldValue).toLowerCase())
    }

    default:
      return false
  }
}

export function evaluateConditionalAssociation(
  association: ConditionalAssociation,
  recordData: Record<string, any>
): boolean {
  if (!association.enabled) {
    return false
  }

  if (association.conditions.length === 0) {
    return false
  }

  if (association.conditionLogic === 'AND') {
    return association.conditions.every(condition => evaluateCondition(condition, recordData))
  } else {
    return association.conditions.some(condition => evaluateCondition(condition, recordData))
  }
}

export interface AssociationAction {
  field: string
  operation: 'add' | 'remove' | 'replace'
  ids: number[]
}

export function getAssociationsForRecord(
  associations: ConditionalAssociation[],
  recordData: Record<string, any>
): AssociationAction[] {
  const actions: AssociationAction[] = []

  for (const association of associations) {
    if (evaluateConditionalAssociation(association, recordData)) {
      actions.push({
        field: association.associationField,
        operation: association.operation,
        ids: association.ids
      })
    }
  }

  return actions
}

export function mergeAssociationActions(actions: AssociationAction[]): Map<string, AssociationAction> {
  const mergedMap = new Map<string, AssociationAction>()

  for (const action of actions) {
    const key = action.field
    const existing = mergedMap.get(key)

    if (!existing) {
      mergedMap.set(key, { ...action })
      continue
    }

    if (action.operation === 'replace') {
      mergedMap.set(key, { ...action })
    } else if (existing.operation === 'replace') {
      continue
    } else if (action.operation === 'add') {
      const newIds = [...existing.ids, ...action.ids]
      mergedMap.set(key, {
        field: action.field,
        operation: 'add',
        ids: Array.from(new Set(newIds))
      })
    } else if (action.operation === 'remove') {
      if (existing.operation === 'add') {
        const filteredIds = existing.ids.filter(id => !action.ids.includes(id))
        mergedMap.set(key, {
          field: action.field,
          operation: 'add',
          ids: filteredIds
        })
      } else {
        const newIds = [...existing.ids, ...action.ids]
        mergedMap.set(key, {
          field: action.field,
          operation: 'remove',
          ids: Array.from(new Set(newIds))
        })
      }
    }
  }

  return mergedMap
}

export function describeCondition(rule: ConditionalRule, fieldLabel?: string): string {
  const field = fieldLabel || rule.field
  const operator = rule.operator
  const value = rule.value

  switch (operator) {
    case 'equals':
      return `${field} equals "${value}"`
    case 'notEquals':
      return `${field} does not equal "${value}"`
    case 'contains':
      return `${field} contains "${value}"`
    case 'notContains':
      return `${field} does not contain "${value}"`
    case 'greaterThan':
      return `${field} is greater than ${value}`
    case 'lessThan':
      return `${field} is less than ${value}`
    case 'isEmpty':
      return `${field} is empty`
    case 'isNotEmpty':
      return `${field} is not empty`
    case 'in':
      return `${field} is in [${value}]`
    case 'notIn':
      return `${field} is not in [${value}]`
    default:
      return `${field} ${operator} ${value}`
  }
}

export function describeAssociation(association: ConditionalAssociation, fieldsMap?: Map<string, string>): string {
  const conditionDescriptions = association.conditions.map(c => 
    describeCondition(c, fieldsMap?.get(c.field))
  )
  
  const conditionsText = conditionDescriptions.length > 1
    ? conditionDescriptions.join(` ${association.conditionLogic} `)
    : conditionDescriptions[0] || 'No conditions'

  const fieldLabel = fieldsMap?.get(association.associationField) || association.associationField
  const idsText = association.ids.length === 1 
    ? `ID ${association.ids[0]}` 
    : `${association.ids.length} IDs`

  let actionText = ''
  switch (association.operation) {
    case 'add':
      actionText = `add ${idsText} to ${fieldLabel}`
      break
    case 'remove':
      actionText = `remove ${idsText} from ${fieldLabel}`
      break
    case 'replace':
      actionText = `replace ${fieldLabel} with ${idsText}`
      break
  }

  return `When ${conditionsText}, ${actionText}`
}
