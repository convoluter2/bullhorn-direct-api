import type { BullhornCredentials, BullhornSession, QueryConfig, QueryResult } from './types'

const BULLHORN_AUTH_URL = 'https://auth-east.bullhornstaffing.com/oauth'
const BULLHORN_LOGIN_URL = 'https://rest.bullhornstaffing.com/rest-services/login'
const BULLHORN_ATS_URL = 'https://cls43.bullhornstaffing.com'

export class BullhornAPI {
  private session: BullhornSession | null = null

  getAuthorizationUrl(clientId: string, redirectUri: string | undefined, state: string, username?: string, password?: string): string {
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
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: clientId,
      client_secret: clientSecret
    })

    if (redirectUri) {
      params.append('redirect_uri', redirectUri)
    }

    const response = await fetch(`${BULLHORN_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    })

    if (!response.ok) {
      const errorText = await response.text()
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
      const authCode = await this.getAuthorizationCode(credentials)
      const tokenData = await this.exchangeCodeForToken(
        authCode,
        credentials.clientId,
        credentials.clientSecret
      )
      const session = await this.login(tokenData.accessToken)
      
      session.refreshToken = tokenData.refreshToken
      session.expiresAt = Date.now() + (tokenData.expiresIn * 1000)
      
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

    const response = await fetch(`${BULLHORN_AUTH_URL}/authorize?${params.toString()}`, {
      method: 'POST',
      redirect: 'manual'
    })

    const locationHeader = response.headers.get('location')
    if (locationHeader) {
      const url = new URL(locationHeader, window.location.origin)
      const code = url.searchParams.get('code')
      if (code) {
        return code
      }
    }

    if (response.redirected) {
      const url = new URL(response.url)
      const code = url.searchParams.get('code')
      if (code) {
        return code
      }
    }

    const responseText = await response.text()
    const codeMatch = responseText.match(/code=([^&"']+)/)
    if (codeMatch) {
      return codeMatch[1]
    }

    throw new Error('No authorization code received. Please check your credentials or use the Authorization Code tab to authenticate manually.')
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
    if (config.filters.length === 0) {
      return '*'
    }

    const conditions = config.filters.map(filter => {
      const operator = this.mapOperator(filter.operator)
      
      if (filter.operator === 'is_null' || filter.operator === 'is_not_null') {
        return `${filter.field}${operator}`
      }
      
      let value = filter.value
      if (value.includes(' ') || value.includes(',')) {
        value = `"${value}"`
      }
      
      return `${filter.field}${operator}${value}`
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

  async getMetadata(entity: string): Promise<any> {
    if (!this.session) {
      throw new Error('Not authenticated')
    }

    const params = new URLSearchParams({
      BhRestToken: this.session.BhRestToken,
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
      fieldCount: data.fields ? data.fields.length : 0
    })
    
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
