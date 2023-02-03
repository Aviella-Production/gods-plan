import fs from 'fs'
import path from 'path'
import process from 'process'
import { authenticate } from '@google-cloud/local-auth'
import { google } from 'googleapis'
import type { BaseExternalAccountClient, OAuth2Client } from 'google-auth-library'

const SCOPES = ['https://www.googleapis.com/auth/drive']
const TOKEN_PATH = path.join(process.cwd(), 'token.json')
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json')

class Authenticate {
  scopes: string[]
  token: string
  credentials: string

  constructor(scopes: string[], tokenPath: string, credentialsPath: string) {
    this.scopes = scopes
    this.token = tokenPath
    this.credentials = credentialsPath
  }

  async loadSavedCredentialsIfExist(): Promise<BaseExternalAccountClient|OAuth2Client|null> {
    try {
      const content = fs.readFileSync(this.token)
      const credentials = JSON.parse(content.toString())
      return google.auth.fromJSON(credentials)
    } catch (err) {
      return null
    }
  }

  async saveCredentials(client: OAuth2Client): Promise<void> {
    const content = fs.readFileSync(this.credentials)
    const keys = JSON.parse(content.toString())
    const key = keys.installed || keys.web
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token
    })
    fs.writeFileSync(this.token, payload)
  }

  async authorize(): Promise<BaseExternalAccountClient|OAuth2Client> {
    let client = await this.loadSavedCredentialsIfExist()
    if (client) return client
    client = await authenticate({
      scopes: this.scopes,
      keyfilePath: this.credentials
    })
    if (client.credentials) await this.saveCredentials(client)
    return client
  }
}

export default class Download extends Authenticate {
  private authClient: Promise<BaseExternalAccountClient | OAuth2Client>

  constructor() {
    super(SCOPES, TOKEN_PATH, CREDENTIALS_PATH)
    this.authClient = this.init()
  }

  async init(): Promise<BaseExternalAccountClient | OAuth2Client> {
    const res = await this.authorize()
    return res
  }

  async listFiles(pageSize: number) {
    const drive = google.drive({ version: 'v3', auth: this.authClient })
  }
}