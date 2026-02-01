const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const User = require('./src/models/User');
    
    const users = await User.find({});
    
    console.log('\n=== EXISTING USERS ===');
    if (users.length === 0) {
      console.log('No users found in database');
    } else {
      console.log(`Total users: ${users.length}`);
      users.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.firstName} ${user.lastName}`);
        console.log(`  Active: ${user.isActive}`);
        console.log(`  ID: ${user._id}`);
        console.log(`  Created: ${user.createdAt}`);
      });
    }
    
    // Also check the exact query that fails
    const testEmail = 'test@example.com';
    const existingUser = await User.findOne({ email: testEmail });
    console.log(`\nChecking if '${testEmail}' exists: ${existingUser ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();