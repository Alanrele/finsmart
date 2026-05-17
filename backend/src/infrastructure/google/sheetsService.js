/**
 * Google Sheets Service — Read-only access via Service Account
 *
 * Environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_JSON — path to service account key file (local)
 *   GOOGLE_SERVICE_ACCOUNT_B64  — base64-encoded service account key (Railway/CI)
 *   GOOGLE_SHEETS_SPREADSHEET_ID — target spreadsheet ID
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const logger = require('../../logging/logger');

let sheetsClient = null;
let authClient = null;

/**
 * Resolves and authenticates a Google JWT client from env.
 * Supports both a file path (GOOGLE_SERVICE_ACCOUNT_JSON) and a
 * base64-encoded blob (GOOGLE_SERVICE_ACCOUNT_B64) for CI/CD.
 */
async function getAuthClient() {
  if (authClient) return authClient;

  let credentials;

  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;

  if (b64) {
    try {
      const json = Buffer.from(b64, 'base64').toString('utf8');
      credentials = JSON.parse(json);
      logger.info('Google Sheets: authenticated via GOOGLE_SERVICE_ACCOUNT_B64');
    } catch (err) {
      logger.error('Google Sheets: failed to parse GOOGLE_SERVICE_ACCOUNT_B64', {
        error: err.message,
      });
      throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_B64 value');
    }
  } else if (filePath) {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Service account key file not found: ${resolved}`);
    }
    credentials = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    logger.info('Google Sheets: authenticated via GOOGLE_SERVICE_ACCOUNT_JSON');
  } else {
    throw new Error(
      'Google Sheets auth not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_B64.'
    );
  }

  authClient = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  await authClient.authorize();
  return authClient;
}

/**
 * Returns an authorized Google Sheets API client (v4).
 */
async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  const auth = await getAuthClient();
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * Fetches values from a given range in the configured spreadsheet.
 *
 * @param {string} range — A1 notation, e.g. "Sheet1!A1:D100"
 * @returns {Promise<string[][]>} 2D array of cell values (row-major)
 */
async function getSheetValues(range) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set');
  }

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return response.data.values || [];
}

/**
 * Fetches metadata about all sheets in the configured spreadsheet.
 *
 * @returns {Promise<Array<{title: string, sheetId: number}>>}
 */
async function getSheetMetadata() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is not set');
  }

  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.get({ spreadsheetId });

  return (response.data.sheets || []).map((s) => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
    rowCount: s.properties.gridProperties?.rowCount,
    columnCount: s.properties.gridProperties?.columnCount,
  }));
}

module.exports = {
  getSheetValues,
  getSheetMetadata,
  getSheetsClient,
};
