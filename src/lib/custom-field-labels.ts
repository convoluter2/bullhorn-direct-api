export const CUSTOM_FIELD_LABELS: Record<string, Record<string, string>> = {
  JobOrder: {
    correlatedCustomFloat2: 'Hourly Low Pay Rate'
  }
}

export function getCustomFieldLabel(entity: string, fieldName: string, defaultLabel: string): string {
  const entityLabels = CUSTOM_FIELD_LABELS[entity]
  if (entityLabels && entityLabels[fieldName]) {
    return entityLabels[fieldName]
  }
  return defaultLabel
}
