import fs from 'fs'
import path from 'path'
import process from 'process'
import chalk from 'chalk'
import figlet from 'figlet'
import { authenticate } from '@google-cloud/local-auth'
import { drive_v3, google } from 'googleapis'
import type { OAuth2Client, JSONClient } from 'google-auth-library'

const SCOPES = ['https://www.googleapis.com/auth/drive']
const TOKEN_PATH = path.join(process.cwd(), 'token.json')
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json')

console.log(chalk.cyan(figlet.textSync('Asset Downloader')), '\n')

class Authenticate {
  scopes: string[]
  token: string
  credentials: string

  constructor(scopes: string[], tokenPath: string, credentialsPath: string) {
    this.scopes = scopes
    this.token = tokenPath
    this.credentials = credentialsPath
  }

  async loadSavedCredentialsIfExist(): Promise<JSONClient | OAuth2Client | null> {
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

  async authorize(): Promise<JSONClient | OAuth2Client> {
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

export default class GoogleDrive {
  drive: drive_v3.Drive

  constructor(drive: drive_v3.Drive) {
    this.drive = drive
  }

  async listFiles(pageSize: number): Promise<void> {
    const res = await this.drive.files.list({
      spaces: 'drive',
      pageSize: pageSize,
      fields: 'nextPageToken, files(id, name)'
    })
    const files = res.data.files
    if (files?.length === 0) {
      console.log('No files found.')
      return
    }
    console.log('Files:')
    files?.map((file) => {
      console.log(`${file.name} (${file.id})`)
    })
  }

  async searchFile(query: string) {
    const res = await this.drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name)',
      spaces: 'drive'
    })
    res.data.files?.forEach((file) => { console.log('Found file:', file.name, file.id) })
    return res.data.files
  }
}

const auths = new Authenticate(SCOPES, TOKEN_PATH, CREDENTIALS_PATH)
const authorize = await auths.authorize()
const drive = new GoogleDrive(google.drive({ version: 'v3', auth: authorize }))
drive.listFiles(10)