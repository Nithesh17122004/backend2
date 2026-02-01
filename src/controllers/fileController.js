const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = require('../config/aws');
const File = require('../models/File');
const User = require('../models/User');
const crypto = require('crypto');

// Configure multer for S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'private',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const userId = req.user.id;
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const extension = file.originalname.split('.').pop();
      const filename = `${userId}/${timestamp}-${randomString}.${extension}`;
      
      cb(null, filename);
    }
  }),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// @desc    Upload file
// @route   POST /api/files/upload
// @access  Private
exports.uploadFile = [
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Please upload a file'
        });
      }

      const { parentFolder } = req.body;
      const user = await User.findById(req.user.id);

      // Check storage limit
      const newStorageUsed = user.storageUsed + req.file.size;
      if (newStorageUsed > user.storageLimit) {
        return res.status(400).json({
          success: false,
          error: 'Storage limit exceeded'
        });
      }

      // Create file record
      const file = await File.create({
        name: req.file.originalname,
        key: req.file.key,
        url: req.file.location,
        size: req.file.size,
        type: req.file.mimetype,
        user: req.user.id,
        parentFolder: parentFolder || null
      });

      // Update user storage
      user.storageUsed = newStorageUsed;
      await user.save();

      res.status(201).json({
        success: true,
        data: file
      });
    } catch (error) {
      next(error);
    }
  }
];

// @desc    Get all files
// @route   GET /api/files
// @access  Private
exports.getFiles = async (req, res, next) => {
  try {
    const { folder } = req.query;
    
    const query = { user: req.user.id };
    if (folder) {
      query.parentFolder = folder;
    } else {
      query.parentFolder = null;
    }

    const files = await File.find(query).sort('-createdAt');

    res.status(200).json({
      success: true,
      count: files.length,
      data: files
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single file
// @route   GET /api/files/:id
// @access  Private
exports.getFile = async (req, res, next) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.status(200).json({
      success: true,
      data: file
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download file
// @route   GET /api/files/:id/download
// @access  Private
exports.downloadFile = async (req, res, next) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Generate signed URL for download
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.key,
      Expires: 300 // 5 minutes
    };

    const signedUrl = s3.getSignedUrl('getObject', params);

    res.status(200).json({
      success: true,
      url: signedUrl,
      filename: file.name
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete file
// @route   DELETE /api/files/:id
// @access  Private
exports.deleteFile = async (req, res, next) => {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // Delete from S3
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.key
    };

    await s3.deleteObject(params).promise();

    // Delete from database
    await file.deleteOne();

    // Update user storage
    const user = await User.findById(req.user.id);
    user.storageUsed = Math.max(0, user.storageUsed - file.size);
    await user.save();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};