const express = require('express');
const {
  createFolder,
  getFolders,
  getFolderContents,
  deleteFolder
} = require('../controllers/folderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/', createFolder);
router.get('/', getFolders);
router.get('/:id/contents', getFolderContents);
router.delete('/:id', deleteFolder);

module.exports = router;