const mongoose = require('mongoose');
require('dotenv').config();

async function resetUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');
    
    // Load User model
    const User = require('./src/models/User');
    
    // Delete ALL users
    const result = await User.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} users`);
    
    // Also clear files and folders if they exist
    try {
      const File = require('./src/models/File');
      const Folder = require('./src/models/Folder');
      
      const fileResult = await File.deleteMany({});
      const folderResult = await Folder.deleteMany({});
      
      console.log(`✅ Deleted ${fileResult.deletedCount} files`);
      console.log(`✅ Deleted ${folderResult.deletedCount} folders`);
    } catch (err) {
      console.log('Note: Files/Folders collections might not exist yet');
    }
    
    // Verify no users remain
    const remainingUsers = await User.countDocuments();
    console.log(`\nRemaining users in database: ${remainingUsers}`);
    
    if (remainingUsers === 0) {
      console.log('\n✅ Database is now clean!');
      console.log('You can now register new users.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

resetUsers();