import type { BullhornEntity } from './types'

export const BULLHORN_ENTITIES: BullhornEntity[] = [
  {
    id: 'Candidate',
    label: 'Candidate',
    fields: ['id', 'firstName', 'lastName', 'email', 'phone', 'mobile', 'address', 'status', 'dateAdded', 'dateLastModified', 'owner', 'source', 'description', 'employeeType', 'occupation']
  },
  {
    id: 'ClientContact',
    label: 'Client Contact',
    fields: ['id', 'firstName', 'lastName', 'email', 'phone', 'mobile', 'clientCorporation', 'address', 'status', 'dateAdded', 'dateLastModified', 'owner', 'description']
  },
  {
    id: 'ClientCorporation',
    label: 'Client Corporation',
    fields: ['id', 'name', 'phone', 'fax', 'website', 'address', 'status', 'dateAdded', 'dateLastModified', 'owner', 'description', 'industry']
  },
  {
    id: 'JobOrder',
    label: 'Job Order',
    fields: ['id', 'title', 'clientCorporation', 'clientContact', 'status', 'dateAdded', 'dateLastModified', 'startDate', 'endDate', 'owner', 'description', 'employmentType', 'salary', 'salaryUnit']
  },
  {
    id: 'JobSubmission',
    label: 'Job Submission',
    fields: ['id', 'candidate', 'jobOrder', 'status', 'dateAdded', 'dateLastModified', 'sendingUser', 'dateWebResponse', 'source', 'isDeleted', 'salary', 'billRate', 'payRate']
  },
  {
    id: 'Placement',
    label: 'Placement',
    fields: ['id', 'candidate', 'jobOrder', 'status', 'dateAdded', 'dateLastModified', 'dateBegin', 'dateEnd', 'employmentType', 'salary', 'salaryUnit', 'owner']
  },
  {
    id: 'Note',
    label: 'Note',
    fields: ['id', 'action', 'commentingPerson', 'comments', 'dateAdded', 'personReference', 'isDeleted']
  },
  {
    id: 'Task',
    label: 'Task',
    fields: ['id', 'subject', 'description', 'dateAdded', 'dateCompleted', 'isCompleted', 'owner', 'taskType', 'priority']
  },
  {
    id: 'Appointment',
    label: 'Appointment',
    fields: ['id', 'subject', 'location', 'dateAdded', 'dateBegin', 'dateEnd', 'owner', 'type', 'isDeleted']
  },
  {
    id: 'CorporateUser',
    label: 'Corporate User',
    fields: ['id', 'firstName', 'lastName', 'email', 'username', 'enabled', 'dateLastModified']
  },
  {
    id: 'Lead',
    label: 'Lead',
    fields: ['id', 'firstName', 'lastName', 'email', 'phone', 'companyName', 'status', 'dateAdded', 'owner', 'description', 'source']
  },
  {
    id: 'Opportunity',
    label: 'Opportunity',
    fields: ['id', 'title', 'clientCorporation', 'clientContact', 'status', 'dateAdded', 'owner', 'estimatedCloseDate', 'estimatedAmount']
  }
]

export function getEntityById(id: string): BullhornEntity | undefined {
  return BULLHORN_ENTITIES.find(e => e.id === id)
}

export function getEntityFields(id: string): string[] {
  const entity = getEntityById(id)
  return entity ? entity.fields : []
}
