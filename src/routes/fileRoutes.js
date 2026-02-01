const express = require('express');
const {
  uploadFile,
  getFiles,
  getFile,
  downloadFile,
  deleteFile
} = require('../controllers/fileController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/upload', uploadFile);
router.get('/', getFiles);
router.get('/:id', getFile);
router.get('/:id/download', downloadFile);
router.delete('/:id', deleteFile);

module.exports = router;