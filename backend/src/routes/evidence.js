const express = require('express');
const router = express.Router();
const evidenceController = require('../controllers/evidenceController');

const { protect, isAdmin } = require('../middleware/auth');

// 2. API endpoint to fetch JSON data for evidence page (MUST come before /:token wildcard)
router.get('/data/:token', evidenceController.getEvidenceData);

// 3. Diagnostic route to inspect uploaded files — ADMIN ONLY
//    (was unauthenticated + path-traversal vulnerable)
router.get('/inspect/:filename', protect, isAdmin, evidenceController.inspectFile);

// 1. Web page to view evidence (wildcard MUST be last)
// NOTE: /evidence/latest was removed — it leaked the newest victim's evidence
// token (full GPS trail + media) to anyone, unauthenticated.
router.get('/:token', evidenceController.renderEvidencePage);

module.exports = router;
