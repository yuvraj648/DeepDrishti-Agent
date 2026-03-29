/**
 * Updates the first four feeds in MongoDB to the Aquascope demo video set:
 * 2× YouTube (2-minute clipped + looping embed) + 2× local MP4 served from the Vite app (/videos/...).
 *
 * Run from repo root:
 *   node BACKEND/server/scripts/updateFeedsVideos.js
 * Or from BACKEND:
 *   node server/scripts/updateFeedsVideos.js
 */
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Feed = require('../models/Feed');

const FEED_PAYLOADS = [
  {
    title: 'Patrol Stream North (YouTube)',
    url: 'https://www.youtube.com/embed/og8bbxl0iW8?rel=0&start=0&end=120&loop=1&playlist=og8bbxl0iW8',
    location: 'Pacific North — Link: https://www.youtube.com/live/og8bbxl0iW8',
    sector: 'Sector Alpha',
    status: 'active',
    detectionEnabled: true,
  },
  {
    title: 'Local preview camera A',
    url: '/videos/feed-local-a.mp4',
    location: 'On-station — Local MP4 (preview)',
    sector: 'Sector Beta',
    status: 'active',
    detectionEnabled: true,
  },
  {
    title: 'Local preview camera B',
    url: '/videos/feed-local-b.mp4',
    location: 'On-station — Local MP4 (preview)',
    sector: 'Sector Gamma',
    status: 'active',
    detectionEnabled: true,
  },
  {
    title: 'Patrol Stream South (YouTube)',
    url: 'https://www.youtube.com/embed/jzx_n25g3kA?rel=0&start=0&end=120&loop=1&playlist=jzx_n25g3kA',
    location: 'Pacific South — Link: https://www.youtube.com/live/jzx_n25g3kA',
    sector: 'Sector Delta',
    status: 'active',
    detectionEnabled: true,
  },
];

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Check BACKEND/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await Feed.find().sort({ createdAt: 1 }).lean();

  for (let i = 0; i < FEED_PAYLOADS.length; i += 1) {
    const payload = FEED_PAYLOADS[i];
    if (existing[i]) {
      await Feed.findByIdAndUpdate(existing[i]._id, {
        $set: {
          ...payload,
          updatedAt: new Date(),
        },
      });
      console.log(`Updated feed [${i + 1}/4]:`, payload.title, String(existing[i]._id));
    } else {
      const doc = await Feed.create(payload);
      console.log(`Created feed [${i + 1}/4]:`, payload.title, String(doc._id));
    }
  }

  const refreshed = await Feed.find().sort({ createdAt: 1 });
  if (refreshed.length > FEED_PAYLOADS.length) {
    for (let j = FEED_PAYLOADS.length; j < refreshed.length; j += 1) {
      await Feed.findByIdAndUpdate(refreshed[j]._id, {
        $set: { status: 'inactive', updatedAt: new Date() },
      });
      console.log('Set inactive (beyond first 4):', String(refreshed[j]._id));
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
