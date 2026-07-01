const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');

// 2. API endpoint to fetch JSON data for evidence page (MUST come before /:token wildcard)
router.get('/data/:token', evidenceController.getEvidenceData);

// 3. Diagnostic route to inspect uploaded files (MUST come before /:token wildcard)
router.get('/inspect/:filename', evidenceController.inspectFile);

// 4. Get latest evidence token (for debugging)
router.get('/latest', evidenceController.getLatestEvidenceToken);

// 1. Web page to view evidence (wildcard MUST be last)
router.get('/:token', evidenceController.renderEvidencePage);

module.exports = router;
