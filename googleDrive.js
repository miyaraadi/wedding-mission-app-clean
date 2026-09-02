// lib/googleDrive.js
//
// Handles all Google Drive interaction for the wedding mission app.
//
// SECURITY NOTE: No client secret, client id, or tokens are ever hardcoded
// here. Everything comes from environment variables:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REDIRECT_URI      (e.g. https://your-domain.com/auth/google/callback)
//   GOOGLE_REFRESH_TOKEN     (obtained once via the /auth/google one-time flow)
//   GOOGLE_DRIVE_FOLDER_ID   (optional - folder to upload into)
//
// Guests never see or touch any of this. Only the wedding couple (server
// owner) goes through the one-time OAuth consent flow, once, after deploy.

const { google } = require('googleapis');
const fs = require('fs');

function getOAuth2Client() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw new Error(
      'Missing Google OAuth environment variables (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI).'
    );
  }

  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

// Used by the one-time /auth/google route to build the consent screen URL.
function getAuthUrl() {
  const oAuth2Client = getOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline', // required to get a refresh_token
    prompt: 'consent', // force refresh_token to be returned even on re-auth
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });
}

// Used by the one-time /auth/google/callback route to exchange the code for tokens.
async function exchangeCodeForTokens(code) {
  const oAuth2Client = getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  return tokens; // tokens.refresh_token is what needs to be saved as GOOGLE_REFRESH_TOKEN
}

function getAuthorizedClient() {
  const oAuth2Client = getOAuth2Client();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!refreshToken) {
    throw new Error(
      'GOOGLE_REFRESH_TOKEN is not set yet. Visit /auth/google once (as the wedding Google account) to authorize Drive access.'
    );
  }

  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
}

// A marker property so we can find "our" files in Drive without needing a
// dedicated folder, and so the admin page never needs a local database.
const APP_TAG = 'wedding-mission-app';

function sanitizeForFilename(str) {
  return String(str).replace(/[\/\\:*?"<>|]/g, '_').trim();
}

// Uploads a local (temporary) file to Drive and waits for Drive to confirm
// the file was created before resolving. The googleapis client automatically
// uses resumable upload under the hood for media bodies, which is what makes
// this practical for large mobile videos. The caller is responsible for
// deleting the temp file afterward (success or failure) - this function
// never assumes anything is kept on local disk.
async function uploadFileToDrive({
  filePath,
  mimeType,
  missionId,
  missionTitle,
  originalFilename,
  uploadTimestamp,
}) {
  const auth = getAuthorizedClient();
  const drive = google.drive({ version: 'v3', auth });

  const driveFilename = sanitizeForFilename(
    `${missionId} - ${missionTitle} - ${originalFilename}`
  );

  const fileMetadata = {
    name: driveFilename,
    ...(process.env.GOOGLE_DRIVE_FOLDER_ID
      ? { parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] }
      : {}),
    // appProperties are private to this app's credentials and are how the
    // admin page reconstructs "uploads grouped by mission" straight from
    // Drive, with no local metadata store required.
    appProperties: {
      app: APP_TAG,
      mission_id: String(missionId),
      mission_title: missionTitle,
      original_filename: originalFilename,
      upload_timestamp: uploadTimestamp,
    },
  };

  const media = {
    mimeType,
    body: fs.createReadStream(filePath),
  };

  // This call resolves only once Drive has confirmed the file exists
  // (the API response includes the real file id) - so awaiting it is the
  // "wait for Google Drive to confirm success" step.
  const res = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink',
  });

  return res.data; // { id, name, webViewLink }
}

// Lists every upload this app has put in Drive, using each file's
// appProperties as the source of truth. No local uploads log is used or
// needed - this is what the admin page calls.
async function listUploadsFromDrive() {
  const auth = getAuthorizedClient();
  const drive = google.drive({ version: 'v3', auth });

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const qParts = ['trashed = false'];
  qParts.push(
    folderId
      ? `'${folderId}' in parents`
      : `appProperties has { key='app' and value='${APP_TAG}' }`
  );

  const files = [];
  let pageToken;
  do {
    const res = await drive.files.list({
      q: qParts.join(' and '),
      fields: 'nextPageToken, files(id, name, webViewLink, appProperties, createdTime)',
      pageSize: 200,
      pageToken,
      orderBy: 'createdTime desc',
    });
    files.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return files;
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  uploadFileToDrive,
  listUploadsFromDrive,
};
