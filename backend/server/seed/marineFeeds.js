const mongoose = require('mongoose');
const Feed = require('../models/Feed');
require('dotenv').config();

// Sample underwater video feeds
const sampleFeeds = [
  {
    title: 'Coral Reef Monitoring Camera',
    url: 'https://www.youtube.com/embed/6zrn4-FfbXw',
    status: 'active',
    location: 'Great Barrier Reef',
    sector: 'Sector Alpha',
    detectionEnabled: true,
    detectionInterval: 10000,
    description: 'Monitoring coral reef health and marine life activity'
  },
  {
    title: 'Deep Sea Exploration Feed',
    url: 'https://www.youtube.com/embed/1Vd2b8sN0Dc',
    status: 'active',
    location: 'Mariana Trench Region',
    sector: 'Sector Beta',
    detectionEnabled: true,
    detectionInterval: 15000,
    description: 'Deep sea surveillance for unusual geological activity'
  },
  {
    title: 'Coastal Security Camera',
    url: 'https://www.youtube.com/embed/mx6gK6z0x0g',
    status: 'active',
    location: 'Naval Base Entrance',
    sector: 'Sector Gamma',
    detectionEnabled: true,
    detectionInterval: 8000,
    description: 'Perimeter security monitoring for naval installations'
  },
  {
    title: 'Underwater Pipeline Monitor',
    url: 'https://www.youtube.com/embed/2OEL4P1Rz04',
    status: 'active',
    location: 'Subsea Pipeline Route',
    sector: 'Sector Delta',
    detectionEnabled: true,
    detectionInterval: 12000,
    description: 'Pipeline integrity and unauthorized activity detection'
  }
];

async function seedMarineFeeds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aquascope', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Clear existing feeds
    await Feed.deleteMany({});
    console.log('Cleared existing feeds');

    // Insert sample feeds
    const insertedFeeds = await Feed.insertMany(sampleFeeds);
    console.log(`Inserted ${insertedFeeds.length} sample marine feeds:`);

    insertedFeeds.forEach((feed, index) => {
      console.log(`${index + 1}. ${feed.title}`);
      console.log(`   Location: ${feed.location}`);
      console.log(`   Sector: ${feed.sector}`);
      console.log(`   URL: ${feed.url}`);
      console.log(`   Detection: ${feed.detectionEnabled ? 'Enabled' : 'Disabled'}`);
      console.log('');
    });

    console.log('Marine feeds seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding marine feeds:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the seeding function
if (require.main === module) {
  seedMarineFeeds();
}

module.exports = { seedMarineFeeds, sampleFeeds };
