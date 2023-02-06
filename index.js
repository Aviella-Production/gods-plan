// Some shit

import { Authenticate, GoogleDrive } from './dist/src/index.js'
import path from 'path'
import process from 'process'
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/drive']
const TOKEN_PATH = path.join(process.cwd(), 'token.json')
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json')

const auths = new Authenticate(SCOPES, TOKEN_PATH, CREDENTIALS_PATH)
const authorize = await auths.authorize()
const drive = new GoogleDrive(google.drive({ version: 'v3', auth: authorize }))

/**
 * Insert search query as you like. Don't know what to do? Go here:
 * https://developers.google.com/drive/api/guides/search-files
 */
const found = await drive.searchFile('mimeType=\'application/vnd.google-apps.folder\' and name=\'GP\'')
const _image = await drive.iterateFolder(found[0].id)
const contentImage = await drive.iterateFolder(_image[0].id)
await drive.downloadFile(contentImage, `${found[0].name}/${_image[0].name}`)