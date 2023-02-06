/* eslint-disable @typescript-eslint/no-non-null-assertion */
import fs from 'fs'
import path from 'path'
import process from 'process'
import chalk from 'chalk'
import figlet from 'figlet'
import pkg from '../package.json' assert { type: 'json' }
import { authenticate } from '@google-cloud/local-auth'
import { drive_v3, google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
type JSONClient = typeof google.auth.JWT.prototype.fromJSON.prototype

export class Authenticate {
  scopes: string[]
  token: string
  credentials: string

  constructor(scopes: string[], tokenPath: string, credentialsPath: string) {
    this.scopes = scopes
    this.token = tokenPath
    this.credentials = credentialsPath
  }

  /**
   * Load saved credentials.
   * @returns {Promise<JSONClient | OAuth2Client | null>}
   */
  async loadSavedCredentialsIfExist(): Promise<JSONClient | OAuth2Client | null> {
    try {
      const content = fs.readFileSync(this.token)
      const credentials = JSON.parse(content.toString())
      return google.auth.fromJSON(credentials)
    } catch (err) {
      return null
    }
  }

  /**
   * Save existing credentials to local.
   * @param client - Your credentials.
   * @returns {Promise<void>}
   */
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

  /**
   * Authorize Google Drive.
   * @returns {Promise<JSONClient | OAuth2Client>}
   */
  async authorize(): Promise<JSONClient | OAuth2Client> {
    console.log(chalk.cyan(figlet.textSync('*Asset Downloader*')), '\n')
    console.log(chalk.yellow('=>'),chalk.magenta('Source code version:'), chalk.green(pkg.version))
    console.log(chalk.yellow('=>'), chalk.magenta.underline.bold('If error occurs I don\'t give a fuck btw.'))
    console.log(chalk.yellow('=>'), chalk.cyan('Check if saved credentials is exist so you just sit there and wait.'))
    let client = await this.loadSavedCredentialsIfExist()
    if (client) {
      console.log(chalk.yellow('=>'), chalk.green('Successfully loaded saved credentials ezpz.'))
      return client
    }
    console.log(chalk.yellow('=>'), chalk.cyan('Nope didn\'t found it, pls login so we can go further.'))
    client = await authenticate({
      scopes: this.scopes,
      keyfilePath: this.credentials
    })
    if (client.credentials) await this.saveCredentials(client)
    console.log(chalk.yellow('=>'), chalk.cyan('Ok nice, imma gonna save this credentials.'))
    return client
  }
}

export class GoogleDrive {
  drive: drive_v3.Drive

  constructor(drive: drive_v3.Drive) {
    this.drive = drive
  }

  /**
   * List all of your file.
   * @param {number} pageSize - How many of item to be shown.
   * @returns {Promise<drive_v3.Schema$File[] | undefined>}
   */
  async listFiles(pageSize: number): Promise<drive_v3.Schema$File[] | undefined> {
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
    return files
  }

  /**
   * Search a file.
   * @param {string} query - Search query. For more info about this, visit this link: https://developers.google.com/drive/api/guides/search-files
   * @returns {Promise<drive_v3.Schema$File[] | undefined>}
   */
  async searchFile(query: string): Promise<drive_v3.Schema$File[] | undefined> {
    const res = await this.drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name)',
      spaces: 'drive',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    })
    // res.data.files?.forEach((file) => { console.log('Found file:', file.name, file.id) })
    return res.data.files
  }

  /**
   * Download file(s).
   * @param {drive_v3.Schema$File[]} file - Array object of file.
   * @param {string} [folderName='temp'] - Folder name to be created. Default is `temp`.
   * @returns {Promise<void>}
   */
  async downloadFile(file: drive_v3.Schema$File[], folderName = 'temp') {
    if (!fs.existsSync(path.join(process.cwd(), folderName))) fs.mkdirSync(path.join(process.cwd(), folderName), { recursive: true })
    for (let i = 0; i < file!.length; i++) {
      const res = await this.drive.files.get({
        fileId: file![i].id!,
        alt: 'media',
        fields: 'files(size)',
        supportsAllDrives: true
      }, {
        responseType: 'stream'
      })
      res.data
        .on('end', () => {
          console.log(chalk.greenBright('✅ Download success!'), chalk.blueBright(`(File ${1+i} of ${file!.length})`))
        })
        .on('error', (err) => {
          console.log(chalk.redBright('Error!'))
          console.error(err)
          return process.exit()
        })
        .pipe(fs.createWriteStream(path.join(process.cwd(), folderName, file![i].name!)))
    }
    setTimeout(() => {
      console.log(chalk.bgCyanBright.black.bold(`\nFinished downloading. Total file downloaded: ${file!.length}`))
      const data = fs.readFileSync(path.join(process.cwd(), 'src/shit.txt'), 'utf-8')
      console.log(data)
    }, 1000)
  }

  /**
   * Iterate through folder.
   * @param {string} folderId - Folder ID.
   * @returns {Promise<drive_v3.Schema$File[] | undefined>}
   */
  async iterateFolder(folderId: string): Promise<drive_v3.Schema$File[] | undefined> {
    const res = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, size)'
    })
    // res.data.files?.forEach((file) => { console.log('Found file:', file.name, file.id) })
    return res.data.files
  }
}