import type { BullhornCredentials, BullhornSession, QueryConfig, QueryResult } from './types'

const BULLHORN_AUTH_URL = 'https://auth-east.bullhornstaffing.com/oauth'
const BULLHORN_LOGIN_URL = 'https://rest.bullhornstaffing.com/rest-services/login'
const BULLHORN_ATS_URL = 'https://cls43.bullhornstaffing.com'

export class BullhornAPI {
  private session: BullhornSession | null = null

  async authenticate(credentials: BullhornCredentials): Promise<BullhornSession> {
    try {
      const authCode = await this.getAuthorizationCode(credentials)
      const accessToken = await this.getAccessToken(credentials, authCode)
      const session = await this.login(accessToken)
      
      this.session = session
      return session
    } catch (error) {
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async getAuthorizationCode(credentials: BullhornCredentials): Promise<string> {
    const params = new URLSearchParams({
      client_id: credentials.clientId,
      response_type: 'code',
      username: credentials.username,
      password: credentials.password,
      action: 'Login'
    })

    const response = await fetch(`${BULLHORN_AUTH_URL}/authorize?${params}`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error('Failed to get authorization code')
    }

    const url = new URL(response.url)
    const code = url.searchParams.get('code')
    
    if (!code) {
      throw new Error('No authorization code received')
    }

    return code
  }

  private async getAccessToken(credentials: BullhornCredentials, code: string): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret
    })

    const response = await fetch(`${BULLHORN_AUTH_URL}/token?${params}`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error('Failed to get access token')
    }

    const data = await response.json()
    return data.access_token
  }

  private async login(accessToken: string): Promise<BullhornSession> {
    const params = new URLSearchParams({
      version: '*',
      access_token: accessToken
    })

    const response = await fetch(`${BULLHORN_LOGIN_URL}?${params}`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error('Failed to login')
    }

    const data = await response.json()
    
    return {
      BhRestToken: data.BhRestToken,
      restUrl: data.restUrl,
      corporationId: data.corporationId,
      userId: data.userId
    }
  }

  setSession(session: BullhornSession) {
    this.session = session
  }

  getSession(): BullhornSession | null {
    return this.session
  }

  async search(config: QueryConfig): Promise<QueryResult> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const query = this.buildQuery(config)
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
      `${this.session.restUrl}search/${config.entity}?${params}`
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
    if (config.filters.length === 0) {
      return '*'
    }

    const conditions = config.filters.map(filter => {
      const operator = this.mapOperator(filter.operator)
      return `${filter.field}${operator}${filter.value}`
    })

    return conditions.join(' AND ')
  }

  private mapOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      'equals': ':',
      'not_equals': ':<>',
      'contains': ':*',
      'greater_than': ':>',
      'less_than': ':<',
      'greater_equal': ':>=',
      'less_equal': ':<=',
      'is_null': ':IS NULL',
      'is_not_null': ':IS NOT NULL'
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
      `${this.session.restUrl}query/${entity}?${queryParams}`
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
      `${this.session.restUrl}entity/${entity}/${id}?${params}`
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
      `${this.session.restUrl}entity/${entity}?${params}`,
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
      `${this.session.restUrl}entity/${entity}/${id}?${params}`,
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
      `${this.session.restUrl}entity/${entity}/${id}?${params}`,
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

  async getMetadata(entity: string): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken
    })

    const response = await fetch(
      `${this.session.restUrl}meta/${entity}?${params}`
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Get metadata failed: ${error}`)
    }

    return await response.json()
  }
}

export const bullhornAPI = new BullhornAPI()
