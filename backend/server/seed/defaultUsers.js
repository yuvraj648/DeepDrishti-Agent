const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Default users with their roles
const defaultUsers = [
  {
    name: 'Captain Atha',
    email: 'captain@aquascope.com',
    password: 'Captain@123',
    role: 'captain'
  },
  {
    name: 'Vice Captain Rao',
    email: 'vice@aquascope.com',
    password: 'Vice@123',
    role: 'vice_captain'
  },
  {
    name: 'Surveillance Head Mehta',
    email: 'surveillance@aquascope.com',
    password: 'Surv@123',
    role: 'surveillance_head'
  },
  {
    name: 'Engineer Singh',
    email: 'engineer@aquascope.com',
    password: 'Eng@123',
    role: 'engineer'
  },
  {
    name: 'Analyst Verma',
    email: 'analyst@aquascope.com',
    password: 'Analyst@123',
    role: 'analyst'
  }
];

// Seed users function
const seedUsers = async () => {
  try {
    console.log('🌱 Starting to seed default users...');

    // Clear existing users (optional - remove if you want to keep existing data)
    // await User.deleteMany({});
    // console.log('🗑️ Cleared existing users');

    for (const user of defaultUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: user.email });
      
      if (existingUser) {
        console.log(`⚠️ User ${user.email} already exists, skipping...`);
        continue;
      }

      // Create new user
      const [firstName, ...lastNameParts] = user.name.split(' ');
      const lastName = lastNameParts.join(' ') || '';
      
      const newUser = await User.create({
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        isActive: true,
        isEmailVerified: true, // Mark as verified for default users
        firstName,
        lastName
      });

      console.log(`✅ Created user: ${newUser.email} (${newUser.role})`);
    }

    console.log('🎉 Default users seeded successfully!');
    
    // Display login credentials
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('====================');
    defaultUsers.forEach(user => {
      console.log(`👤 ${user.name}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🔑 Password: ${user.password}`);
      console.log(`🎭 Role: ${user.role}`);
      console.log('---------------------');
    });

  } catch (error) {
    console.error('❌ Error seeding users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 MongoDB disconnected');
  }
};

// Run the seeding
const runSeed = async () => {
  await connectDB();
  await seedUsers();
  process.exit(0);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (error, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', error);
  process.exit(1);
});

// Run the seed
runSeed();
