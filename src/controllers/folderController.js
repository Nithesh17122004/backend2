const Folder = require('../models/Folder');
const File = require('../models/File');

// @desc    Create folder
// @route   POST /api/folders
// @access  Private
exports.createFolder = async (req, res, next) => {
  try {
    const { name, parentFolder } = req.body;

    // Check if folder with same name exists in same location
    const existingFolder = await Folder.findOne({
      name,
      user: req.user.id,
      parentFolder: parentFolder || null
    });

    if (existingFolder) {
      return res.status(400).json({
        success: false,
        error: 'Folder with this name already exists'
      });
    }

    // Generate path
    let path = `/${name}`;
    if (parentFolder) {
      const parent = await Folder.findById(parentFolder);
      if (parent) {
        path = `${parent.path}/${name}`;
      }
    }

    const folder = await Folder.create({
      name,
      user: req.user.id,
      parentFolder: parentFolder || null,
      path
    });

    res.status(201).json({
      success: true,
      data: folder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all folders
// @route   GET /api/folders
// @access  Private
exports.getFolders = async (req, res, next) => {
  try {
    const { parent } = req.query;
    
    const query = { user: req.user.id };
    if (parent) {
      query.parentFolder = parent;
    } else {
      query.parentFolder = null;
    }

    const folders = await Folder.find(query).sort('-createdAt');

    res.status(200).json({
      success: true,
      count: folders.length,
      data: folders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get folder contents
// @route   GET /api/folders/:id/contents
// @access  Private
exports.getFolderContents = async (req, res, next) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }

    // Get subfolders
    const subfolders = await Folder.find({
      parentFolder: folder._id,
      user: req.user.id
    });

    // Get files
    const files = await File.find({
      parentFolder: folder._id,
      user: req.user.id
    });

    res.status(200).json({
      success: true,
      data: {
        folder,
        subfolders,
        files
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete folder
// @route   DELETE /api/folders/:id
// @access  Private
exports.deleteFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found'
      });
    }

    // Check if folder has contents
    const subfolders = await Folder.countDocuments({ parentFolder: folder._id });
    const files = await File.countDocuments({ parentFolder: folder._id });

    if (subfolders > 0 || files > 0) {
      return res.status(400).json({
        success: false,
        error: 'Folder is not empty. Delete contents first.'
      });
    }

    await folder.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};