import type { BullhornCredentials, BullhornSession, QueryConfig, QueryResult } from './types'
import { toast } from 'sonner'

const BULLHORN_AUTH_URL = 'https://auth-east.bullhornstaffing.com/oauth'
const BULLHORN_LOGIN_URL = 'https://rest.bullhornstaffing.com/rest-services/login'
const BULLHORN_ATS_URL = 'https://cls43.bullhornstaffing.com'

export class BullhornAPI {
  private session: BullhornSession | null = null

  getAuthorizationUrl(clientId: string, state: string, username?: string, password?: string, redirectUri?: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      state: state
    })
    
    if (redirectUri) {
      params.append('redirect_uri', redirectUri)
    }
    
    if (username && password) {
      params.append('action', 'Login')
      params.append('username', username)
      params.append('password', password)
    }
    
    return `${BULLHORN_AUTH_URL}/authorize?${params.toString()}`
  }

  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri?: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    let finalCode = code
    
    if (code.includes('%3A') || code.includes('%2F') || code.includes('%3a')) {
      finalCode = decodeURIComponent(code)
      console.log('Code was URL-encoded, decoded it:', { original: code.substring(0, 40), decoded: finalCode.substring(0, 40) })
    }
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: finalCode,
      client_id: clientId,
      client_secret: clientSecret
    })

    if (redirectUri) {
      params.append('redirect_uri', redirectUri)
    }

    console.log('Exchanging code for token:', {
      codeLength: finalCode.length,
      clientIdPreview: clientId.substring(0, 10) + '...',
      hasRedirectUri: !!redirectUri
    })

    const response = await fetch(`${BULLHORN_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Token exchange failed:', errorText)
      throw new Error(`Failed to exchange code for token: ${errorText}`)
    }

    const data = await response.json()
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in || 600
    }
  }

  async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    })

    const response = await fetch(`${BULLHORN_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to refresh access token: ${errorText}`)
    }

    const data = await response.json()
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in || 600
    }
  }

  async login(accessToken: string): Promise<BullhornSession> {
    const params = new URLSearchParams({
      version: '*',
      access_token: accessToken
    })

    const response = await fetch(`${BULLHORN_LOGIN_URL}?${params.toString()}`, {
      method: 'POST'
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to login with access token: ${errorText}`)
    }

    const data = await response.json()
    
    return {
      BhRestToken: data.BhRestToken,
      restUrl: data.restUrl,
      corporationId: data.corporationId,
      userId: data.userId,
      accessToken: accessToken
    }
  }

  async authenticate(credentials: BullhornCredentials): Promise<BullhornSession> {
    try {
      console.log('Starting programmatic authentication...')
      const authCode = await this.getAuthorizationCode(credentials)
      console.log('Got authorization code:', authCode)
      
      const tokenData = await this.exchangeCodeForToken(
        authCode,
        credentials.clientId,
        credentials.clientSecret
      )
      console.log('Got access token, logging in...')
      
      const session = await this.login(tokenData.accessToken)
      
      session.refreshToken = tokenData.refreshToken
      session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)
      
      this.session = session
      console.log('Authentication complete!')
      return session
    } catch (error) {
      console.error('Authentication failed:', error)
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async getAuthorizationCode(credentials: BullhornCredentials): Promise<string> {
    const state = 'auto-' + Math.random().toString(36).substring(7)
    
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      response_type: 'code',
      username: credentials.username,
      password: credentials.password,
      action: 'Login',
      state: state
    })

    try {
      const response = await fetch(`${BULLHORN_AUTH_URL}/authorize?${params.toString()}`, {
        method: 'POST',
        redirect: 'follow',
        credentials: 'include'
      })

      if (response.redirected && response.url) {
        const url = new URL(response.url)
        const code = url.searchParams.get('code')
        if (code) {
          const decodedCode = decodeURIComponent(code)
          console.log('Got authorization code from redirect URL:', decodedCode)
          return decodedCode
        }
      }

      const responseText = await response.text()
      
      const urlMatches = responseText.match(/(?:href|location)=["']([^"']*code=[^"']*)["']/i)
      if (urlMatches && urlMatches[1]) {
        const url = new URL(urlMatches[1].replace(/&amp;/g, '&'), window.location.origin)
        const code = url.searchParams.get('code')
        if (code) {
          const decodedCode = decodeURIComponent(code)
          console.log('Got authorization code from response HTML:', decodedCode)
          return decodedCode
        }
      }

      const codeMatch = responseText.match(/[?&]code=([^&"'<>\s]+)/)
      if (codeMatch) {
        const decodedCode = decodeURIComponent(codeMatch[1])
        console.log('Got authorization code from pattern match:', decodedCode)
        return decodedCode
      }

      console.error('Failed to extract code. Response:', {
        url: response.url,
        redirected: response.redirected,
        status: response.status,
        textPreview: responseText.substring(0, 500)
      })

      throw new Error('No authorization code received. The automated flow failed - please use the manual OAuth flow instead.')
    } catch (error) {
      if (error instanceof Error && error.message.includes('authorization code')) {
        throw error
      }
      console.error('Authorization code extraction error:', error)
      throw new Error('Failed to get authorization code automatically. Please use the manual OAuth flow with the "Start Automated OAuth Flow" button.')
    }
  }

  setSession(session: BullhornSession) {
    this.session = session
  }

  getSession(): BullhornSession | null {
    return this.session
  }

  async search(config: QueryConfig, rawQuery?: string): Promise<QueryResult> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const query = rawQuery || this.buildQuery(config)
    const fields = config.fields.join(',')
    const count = config.count || 500
    const start = config.start || 0

    const params = new URLSearchParams({
      query: query,
      fields: fields,
      count: count.toString(),
      start: start.toString(),
      BhRestToken: this.session.BhRestToken
    })

    if (config.orderBy) {
      params.append('orderBy', config.orderBy)
    }

    const response = await fetch(
      `${this.session.restUrl}search/${config.entity}?${params.toString()}`
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Search failed: ${error}`)
    }

    const result = await response.json()
    
    return {
      data: result.data || [],
      total: result.total || 0,
      count: result.count || 0,
      start: result.start || 0
    }
  }

  private buildQuery(config: QueryConfig): string {
    if (config.filterGroups && config.filterGroups.length > 0) {
      const groupConditions = config.filterGroups
        .filter(group => group.filters.length > 0)
        .map(group => {
          const groupFilters = group.filters
            .filter(f => f.field && (f.value || f.operator === 'is_null' || f.operator === 'is_not_null'))
            .map(filter => this.buildFilterCondition(filter))
          
          if (groupFilters.length === 0) return ''
          if (groupFilters.length === 1) return groupFilters[0]
          
          return `(${groupFilters.join(` ${group.logic} `)})`
        })
        .filter(condition => condition !== '')

      if (groupConditions.length === 0) return '*'
      if (groupConditions.length === 1) return groupConditions[0]
      
      const groupLogic = config.groupLogic || 'AND'
      return groupConditions.join(` ${groupLogic} `)
    }

    if (config.filters.length === 0) {
      return '*'
    }

    const conditions = config.filters
      .filter(f => f.field && (f.value || f.operator === 'is_null' || f.operator === 'is_not_null'))
      .map(filter => this.buildFilterCondition(filter))

    if (conditions.length === 0) return '*'
    
    return conditions.join(' AND ')
  }

  private buildFilterCondition(filter: any): string {
    const operator = this.mapOperator(filter.operator)
    
    if (filter.operator === 'is_null' || filter.operator === 'is_not_null') {
      return `${filter.field}${operator}`
    }
    
    if (filter.operator === 'in_list' || filter.operator === 'in_list_parens') {
      const values = filter.value.split(',').map((v: string) => v.trim())
      if (filter.operator === 'in_list') {
        return `${filter.field}:[${values.join(',')}]`
      } else {
        return `${filter.field}:(${values.join(',')})`
      }
    }
    
    if (filter.operator === 'between_inclusive' || filter.operator === 'between_exclusive') {
      const values = filter.value.split(',').map((v: string) => v.trim())
      if (values.length < 2) {
        return `${filter.field}:${filter.value}`
      }
      if (filter.operator === 'between_inclusive') {
        return `${filter.field}:..[${values[0]},${values[1]}]`
      } else {
        return `${filter.field}:..(${values[0]},${values[1]})`
      }
    }
    
    if (filter.operator === 'starts_with') {
      return `${filter.field}:*[${filter.value}`
    }
    
    if (filter.operator === 'ends_with') {
      return `${filter.field}:]${filter.value}`
    }
    
    if (filter.operator === 'contains') {
      return `${filter.field}:*${filter.value}*`
    }
    
    if (filter.operator === 'lucene') {
      return `${filter.field}~"${filter.value}"`
    }
    
    let value = filter.value
    if (value.includes(' ') || value.includes(',')) {
      value = `"${value}"`
    }
    
    return `${filter.field}${operator}${value}`
  }

  private mapOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      'equals': ':',
      'not_equals': ':<>',
      'contains': ':*',
      'starts_with': ':*[',
      'ends_with': ':]',
      'greater_than': ':>',
      'less_than': ':<',
      'greater_equal': ':>=',
      'less_equal': ':<=',
      'is_null': ':IS NULL',
      'is_not_null': ':IS NOT NULL',
      'in_list': ':[',
      'in_list_parens': ':(',
      'between_inclusive': ':..[',
      'between_exclusive': ':..(',
      'lucene': '~'
    }
    return operatorMap[operator] || ':'
  }

  async query(entity: string, fields: string[], where?: string, params?: Record<string, any>): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const queryParams = new URLSearchParams({
      fields: fields.join(','),
      BhRestToken: this.session.BhRestToken
    })

    if (where) {
      queryParams.append('where', where)
    }

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        queryParams.append(key, String(value))
      })
    }

    const response = await fetch(
      `${this.session.restUrl}query/${entity}?${queryParams.toString()}`
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Query failed: ${error}`)
    }

    return await response.json()
  }

  async getEntity(entity: string, id: number, fields: string[]): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      fields: fields.join(','),
      BhRestToken: this.session.BhRestToken
    })

    const response = await fetch(
      `${this.session.restUrl}entity/${entity}/${id}?${params.toString()}`
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Get entity failed: ${error}`)
    }

    return await response.json()
  }

  async createEntity(entity: string, data: any): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken
    })

    const response = await fetch(
      `${this.session.restUrl}entity/${entity}?${params.toString()}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Create entity failed: ${error}`)
    }

    return await response.json()
  }

  async updateEntity(entity: string, id: number, data: any): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken
    })

    const response = await fetch(
      `${this.session.restUrl}entity/${entity}/${id}?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Update entity failed: ${error}`)
    }

    return await response.json()
  }

  async deleteEntity(entity: string, id: number): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken
    })

    const response = await fetch(
      `${this.session.restUrl}entity/${entity}/${id}?${params.toString()}`,
      {
        method: 'DELETE'
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Delete entity failed: ${error}`)
    }

    return await response.json()
  }

  private extractOwningEntity(errorText: string, entity: string, association: string): { owningEntity: string; inverseField: string } | null {
    try {
      const errorData = JSON.parse(errorText)
      const errorMessage = errorData.errorMessage || ''
      
      const ownershipPattern = /association between (\w+) and (\w+) is owned by (\w+)/i
      const match = errorMessage.match(ownershipPattern)
      
      if (match) {
        const [, entity1, entity2, owningEntity] = match
        
        if (owningEntity === entity2) {
          return {
            owningEntity: entity2,
            inverseField: entity1.charAt(0).toLowerCase() + entity1.slice(1)
          }
        } else if (owningEntity === entity1) {
          return {
            owningEntity: entity1,
            inverseField: entity2.charAt(0).toLowerCase() + entity2.slice(1)
          }
        }
      }
    } catch (e) {
    }
    
    return null
  }

  private async associateToManyInverse(
    owningEntity: string,
    owningEntityIds: number[],
    inverseFieldName: string,
    targetEntityId: number
  ): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const results: Array<{ id: number; result: any }> = []
    const errors: Array<{ id: number; error: string }> = []

    for (const owningId of owningEntityIds) {
      try {
        const params = new URLSearchParams({
          BhRestToken: this.session.BhRestToken
        })

        const firstData = {
          [inverseFieldName]: { id: targetEntityId }
        }
        const secondFieldName = this.inferSecondField(owningEntity, inverseFieldName)
        const createData = {
          [inverseFieldName]: { id: targetEntityId },
          [secondFieldName]: { id: owningId }
        }

        let response = await fetch(
          `${this.session.restUrl}entity/${owningEntity}/${owningId}?${params.toString()}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(firstData)
          }
        )

        if (!response.ok) {
          const error = await response.text()
          
          try {
            const errorData = JSON.parse(error)
            if (errorData.errorCode === 400 && errorData.errorMessage?.includes('Operation UPDATE not allowed')) {
              console.warn(`UPDATE not allowed on ${owningEntity} id ${owningId}, creating new association record instead...`)
              toast.info(`Creating new ${owningEntity} association record...`)
              
              response = await fetch(
                `${this.session.restUrl}entity/${owningEntity}?${params.toString()}`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(createData)
                }
              )
              
              if (!response.ok) {
                const putError = await response.text()
                errors.push({ id: owningId, error: putError })
              } else {
                const result = await response.json()
                results.push({ id: owningId, result })
              }
            } else {
              errors.push({ id: owningId, error })
            }
          } catch (parseError) {
            errors.push({ id: owningId, error })
          }
        } else {
          const result = await response.json()
          results.push({ id: owningId, result })
        }
      } catch (error) {
        errors.push({ 
          id: owningId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`All inverse associations failed: ${JSON.stringify(errors)}`)
    }

    return {
      changedEntityType: owningEntity,
      changedEntityId: targetEntityId,
      changeType: 'ASSOCIATE_INVERSE',
      message: `Successfully associated ${results.length} ${owningEntity} records${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      results,
      errors
    }
  }

  private inferSecondField(owningEntity: string, inverseFieldName: string): string {
    const entityLower = owningEntity.toLowerCase()
    
    if (entityLower.includes('certification')) {
      if (inverseFieldName === 'clientCorporation') {
        return 'certification'
      }
      if (inverseFieldName === 'candidate') {
        return 'certification'
      }
      if (inverseFieldName === 'placement') {
        return 'certification'
      }
    }
    
    if (entityLower.endsWith('s')) {
      return entityLower.slice(0, -1)
    }
    
    return 'entity'
  }

  async associateToMany(
    entity: string,
    entityId: number,
    association: string,
    associationIds: number[]
  ): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken
    })

    const idsParam = associationIds.join(',')

    const response = await fetch(
      `${this.session.restUrl}entity/${entity}/${entityId}/${association}/${idsParam}?${params.toString()}`,
      {
        method: 'PUT'
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      
      const ownershipError = this.extractOwningEntity(errorText, entity, association)
      if (ownershipError) {
        console.warn(`Association owned by ${ownershipError.owningEntity}, attempting inverse operation...`)
        toast.info(`Redirecting: Association is owned by ${ownershipError.owningEntity}. Updating those records instead...`)
        return await this.associateToManyInverse(
          ownershipError.owningEntity,
          associationIds,
          ownershipError.inverseField,
          entityId
        )
      }
      
      throw new Error(`Associate to-many failed: ${errorText}`)
    }

    return await response.json()
  }

  private async disassociateToManyInverse(
    owningEntity: string,
    owningEntityIds: number[],
    inverseFieldName: string
  ): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const results: Array<{ id: number; result: any }> = []
    const errors: Array<{ id: number; error: string }> = []

    for (const owningId of owningEntityIds) {
      try {
        const params = new URLSearchParams({
          BhRestToken: this.session.BhRestToken
        })

        console.warn(`Attempting to delete ${owningEntity} association record id ${owningId}...`)
        toast.info(`Deleting ${owningEntity} association record...`)
        
        const response = await fetch(
          `${this.session.restUrl}entity/${owningEntity}/${owningId}?${params.toString()}`,
          {
            method: 'DELETE'
          }
        )

        if (!response.ok) {
          const error = await response.text()
          errors.push({ id: owningId, error })
        } else {
          const result = await response.json()
          results.push({ id: owningId, result })
        }
      } catch (error) {
        errors.push({ 
          id: owningId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`All inverse disassociations failed: ${JSON.stringify(errors)}`)
    }

    return {
      changedEntityType: owningEntity,
      changeType: 'DISASSOCIATE_INVERSE',
      message: `Successfully disassociated ${results.length} ${owningEntity} records${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      results,
      errors
    }
  }

  async disassociateToMany(
    entity: string,
    entityId: number,
    association: string,
    associationIds: number[]
  ): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken
    })

    const idsParam = associationIds.join(',')

    const response = await fetch(
      `${this.session.restUrl}entity/${entity}/${entityId}/${association}/${idsParam}?${params.toString()}`,
      {
        method: 'DELETE'
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      
      const ownershipError = this.extractOwningEntity(errorText, entity, association)
      if (ownershipError) {
        console.warn(`Association owned by ${ownershipError.owningEntity}, attempting inverse disassociation...`)
        toast.info(`Redirecting: Association is owned by ${ownershipError.owningEntity}. Updating those records instead...`)
        return await this.disassociateToManyInverse(
          ownershipError.owningEntity,
          associationIds,
          ownershipError.inverseField
        )
      }
      
      throw new Error(`Disassociate to-many failed: ${errorText}`)
    }

    return await response.json()
  }

  async updateToManyAssociation(
    entity: string,
    entityId: number,
    association: string,
    associationIds: number[],
    operation: 'add' | 'remove' | 'replace' = 'add'
  ): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    switch (operation) {
      case 'add':
        return this.associateToMany(entity, entityId, association, associationIds)
      
      case 'remove':
        return this.disassociateToMany(entity, entityId, association, associationIds)
      
      case 'replace':
        const currentAssociations = await this.getToManyAssociation(entity, entityId, association)
        const currentIds = currentAssociations.data?.map((item: any) => item.id) || []
        
        if (currentIds.length > 0) {
          await this.disassociateToMany(entity, entityId, association, currentIds)
        }
        
        if (associationIds.length > 0) {
          return this.associateToMany(entity, entityId, association, associationIds)
        }
        
        return { success: true, message: 'Association replaced successfully' }
      
      default:
        throw new Error(`Invalid operation: ${operation}`)
    }
  }

  async getToManyAssociation(
    entity: string,
    entityId: number,
    association: string,
    fields?: string[],
    start?: number,
    count?: number
  ): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken
    })

    if (fields && fields.length > 0) {
      params.append('fields', fields.join(','))
    }

    if (start !== undefined) {
      params.append('start', start.toString())
    }

    if (count !== undefined) {
      params.append('count', count.toString())
    }

    const response = await fetch(
      `${this.session.restUrl}entity/${entity}/${entityId}/${association}?${params.toString()}`
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Get to-many association failed: ${error}`)
    }

    return await response.json()
  }

  async updateMultipleEntities(
    entity: string,
    updates: Array<{ id: number; data: any }>
  ): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const results: Array<{ id: number; success: boolean; result: any }> = []
    const errors: Array<{ id: number; success: boolean; error: string }> = []

    for (const update of updates) {
      try {
        const result = await this.updateEntity(entity, update.id, update.data)
        results.push({ id: update.id, success: true, result })
      } catch (error) {
        errors.push({
          id: update.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return {
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors
    }
  }

  async createEffectiveDateEntity(
    entity: string,
    parentEntityId: number,
    effectiveDate: number,
    data: any
  ): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken
    })

    const payload = {
      ...data,
      effectiveDate: effectiveDate
    }

    const response = await fetch(
      `${this.session.restUrl}entity/${entity}?${params.toString()}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Create effective date entity failed: ${error}`)
    }

    return await response.json()
  }

  async updateEffectiveDateEntity(
    entity: string,
    entityId: number,
    effectiveDate: number,
    data: any
  ): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken,
      effectiveDate: effectiveDate.toString()
    })

    const response = await fetch(
      `${this.session.restUrl}entity/${entity}/${entityId}?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Update effective date entity failed: ${error}`)
    }

    return await response.json()
  }

  async deleteEffectiveDateEntity(
    entity: string,
    entityId: number,
    effectiveDate: number
  ): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken,
      effectiveDate: effectiveDate.toString()
    })

    const response = await fetch(
      `${this.session.restUrl}entity/${entity}/${entityId}?${params.toString()}`,
      {
        method: 'DELETE'
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Delete effective date entity failed: ${error}`)
    }

    return await response.json()
  }

  async getMetadata(entity: string): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken,
      fields: '*',
      meta: 'full'
    })

    console.log(`Fetching metadata for entity: ${entity}`)
    console.log(`URL: ${this.session.restUrl}meta/${entity}?${params.toString()}`)

    const response = await fetch(
      `${this.session.restUrl}meta/${entity}?${params.toString()}`
    )

    if (!response.ok) {
      const error = await response.text()
      console.error(`Get metadata failed for ${entity}:`, error)
      throw new Error(`Get metadata failed: ${error}`)
    }

    const data = await response.json()
    
    console.log(`Metadata response for ${entity}:`, {
      entity: data.entity,
      label: data.label,
      fieldCount: data.fields ? data.fields.length : 0,
      hasFields: !!data.fields,
      firstFewFields: data.fields ? data.fields.slice(0, 3).map((f: any) => f.name) : []
    })
    
    if (!data.fields || data.fields.length === 0) {
      console.warn(`No fields returned for ${entity}, trying alternative approach...`)
      
      const altParams = new URLSearchParams({
        BhRestToken: this.session.BhRestToken
      })
      
      const altResponse = await fetch(
        `${this.session.restUrl}meta/${entity}?${altParams.toString()}`
      )
      
      if (altResponse.ok) {
        const altData = await altResponse.json()
        console.log(`Alternative metadata response for ${entity}:`, {
          entity: altData.entity,
          label: altData.label,
          fieldCount: altData.fields ? altData.fields.length : 0
        })
        
        if (altData.fields && altData.fields.length > 0) {
          return altData
        }
      }
    }
    
    return data
  }

  async getFieldOptions(entity: string, field: string): Promise<any[]> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken,
      count: '500'
    })

    const response = await fetch(
      `${this.session.restUrl}options/${entity}/${field}?${params.toString()}`
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Get field options failed: ${error}`)
    }

    const data = await response.json()
    
    if (Array.isArray(data.data)) {
      return data.data
    }
    
    return []
  }

  async getAllEntities(): Promise<string[]> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken
    })

    const response = await fetch(
      `${this.session.restUrl}settings?${params.toString()}`
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Settings endpoint failed:', error)
      
      const fallbackEntities = [
        'Appointment',
        'AppointmentAttendee',
        'BusinessSector',
        'Candidate',
        'CandidateCertification',
        'CandidateEducation',
        'CandidateReference',
        'CandidateWorkHistory',
        'Category',
        'Certification',
        'ClientContact',
        'ClientCorporation',
        'CorporateUser',
        'CorporationDepartment',
        'Country',
        'CustomAction',
        'DistributionList',
        'HousingComplex',
        'JobOrder',
        'JobSubmission',
        'Lead',
        'Note',
        'NoteEntity',
        'Opportunity',
        'Placement',
        'PlacementCertification',
        'PlacementChangeRequest',
        'PlacementCommission',
        'Sendout',
        'Skill',
        'Specialty',
        'State',
        'Task',
        'Tearsheet',
        'TimeUnit',
        'UserType'
      ]
      
      return fallbackEntities.sort()
    }

    const data = await response.json()
    
    console.log('Settings response:', data)
    
    if (data.settings && Array.isArray(data.settings.allEntities)) {
      return data.settings.allEntities.sort()
    }
    
    if (Array.isArray(data.allEntities)) {
      return data.allEntities.sort()
    }

    const fallbackEntities = [
      'Appointment',
      'AppointmentAttendee',
      'BusinessSector',
      'Candidate',
      'CandidateCertification',
      'CandidateEducation',
      'CandidateReference',
      'CandidateWorkHistory',
      'Category',
      'Certification',
      'ClientContact',
      'ClientCorporation',
      'CorporateUser',
      'CorporationDepartment',
      'Country',
      'CustomAction',
      'DistributionList',
      'HousingComplex',
      'JobOrder',
      'JobSubmission',
      'Lead',
      'Note',
      'NoteEntity',
      'Opportunity',
      'Placement',
      'PlacementCertification',
      'PlacementChangeRequest',
      'PlacementCommission',
      'Sendout',
      'Skill',
      'Specialty',
      'State',
      'Task',
      'Tearsheet',
      'TimeUnit',
      'UserType'
    ]
    
    return fallbackEntities.sort()
  }
}

export const bullhornAPI = new BullhornAPI()
