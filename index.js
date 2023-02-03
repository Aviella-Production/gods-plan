/* eslint-disable no-unused-vars */
import fs from 'fs';
import path from 'path';
import process from 'process';
import {authenticate} from '@google-cloud/local-auth';
import {google} from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = fs.readFileSync(TOKEN_PATH);
    const credentials = JSON.parse(content.toString());
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = fs.readFileSync(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  fs.writeFileSync(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) return client;
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) await saveCredentials(client);
  return client;
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function listFiles(authClient) {
  const drive = google.drive({
    version: 'v3',
    auth: authClient,
  });
  const res = await drive.files.list({
    spaces: 'drive',
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)',
  });
  const files = res.data.files;
  if (files.length == 0) {
    console.log('No files found.');
    return;
  }
  console.log('Files:');
  files.map((file) => {
    console.log(`${file.name} (${file.id})`);
  });
}

/**
 * Search file in drive location.
 * @param {string} query
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @return {obj} data file
 */
async function searchFile(query, authClient) {
  const drive = google.drive({
    version: 'v3',
    auth: authClient,
  });
  try {
    const res = await drive.files.list({
      q: query,
      fields: 'nextPageToken, files(id, name)',
      spaces: 'drive',
    });
    res.data.files.forEach((file) => {
      console.log('Found file:', file.name, file.id);
    });
    return res.data.files;
  } catch (err) {
    throw err;
  }
}

/**
 * Downloads a file.
 * @param {string} fileId File ID.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 * @return {obj} File status
 */
async function downloadFile(fileId, authClient) {
  const drive = google.drive({
    version: 'v3',
    auth: authClient,
  });
  try {
    const file = await drive.files.get({
      fileId: fileId,
      alt: 'media',
    }, {
      responseType: 'stream',
    });
    file.data
        .on('end', () => console.log('Download success!'))
        .on('error', (err) => {
          console.error(err);
          return process.exit();
        })
        .pipe(fs.createWriteStream('test.png'));
  } catch (err) {
    throw err;
  }
}

authorize()
    .then(async (auth) => {
      const found = await searchFile('name = \'abstract.png\'', auth);
      if (!found) return console.log('File not found.');
      await downloadFile(found[0].id, auth);
    })
    .catch(console.error);
