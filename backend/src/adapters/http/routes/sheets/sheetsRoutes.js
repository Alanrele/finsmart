/**
 * Google Sheets API Routes — Read-only data extraction
 *
 * All endpoints require valid JWT auth (middleware applied in server.js).
 */

const express = require('express');
const router = express.Router();
const logger = require('../../../../infrastructure/logging/logger');
const sheetsService = require('../../../../infrastructure/google/sheetsService');

/**
 * GET /api/sheets — List all sheets in the configured spreadsheet
 */
router.get('/', async (req, res) => {
  try {
    const sheets = await sheetsService.getSheetMetadata();
    res.json({ success: true, sheets });
  } catch (error) {
    logger.error('sheets: failed to list sheets', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sheet metadata',
      detail: error.message,
    });
  }
});

/**
 * GET /api/sheets/:sheetName — Fetch all values from a specific sheet
 * Query params:
 *   ?range=Sheet1!A1:D100  — override the auto range (optional)
 */
router.get('/:sheetName', async (req, res) => {
  try {
    const { sheetName } = req.params;
    const range = req.query.range || sheetName;
    const values = await sheetsService.getSheetValues(range);
    res.json({ success: true, sheet: sheetName, range, rows: values.length, values });
  } catch (error) {
    logger.error('sheets: failed to fetch values', {
      sheet: req.params.sheetName,
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sheet values',
      detail: error.message,
    });
  }
});

module.exports = router;
