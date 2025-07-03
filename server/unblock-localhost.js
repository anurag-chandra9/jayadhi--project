// unblock-localhost.js
// Run this script to unblock localhost and clear failed login attempts

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import your models
const BlockedIP = require('./models/blockedIPModel');
const SecurityEvent = require('./models/securityEventModel');

async function unblockLocalhost() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // List of localhost IP variations to unblock
    const localhostIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];

    console.log('🔓 Unblocking localhost IPs...');
    
    // Remove blocked localhost IPs
    const unblockResult = await BlockedIP.deleteMany({
      ipAddress: { $in: localhostIPs }
    });
    
    console.log(`✅ Unblocked ${unblockResult.deletedCount} localhost IP entries`);

    // Optional: Clean up old security events for localhost (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const securityEventResult = await SecurityEvent.deleteMany({
      ipAddress: { $in: localhostIPs },
      timestamp: { $gte: yesterday },
      eventType: { $in: ['failed_login', 'blocked_request'] }
    });
    
    console.log(`🧹 Cleaned up ${securityEventResult.deletedCount} localhost security events`);

    // Show current blocked IPs (excluding localhost)
    const remainingBlocked = await BlockedIP.find({
      ipAddress: { $nin: localhostIPs }
    });
    
    console.log(`📊 Remaining blocked IPs: ${remainingBlocked.length}`);
    if (remainingBlocked.length > 0) {
      remainingBlocked.forEach(ip => {
        console.log(`   - ${ip.ipAddress} (${ip.reason}) - expires: ${ip.expiresAt || 'permanent'}`);
      });
    }

    console.log('✅ Localhost unblocking completed successfully!');
    console.log('🚀 You can now restart your server and try logging in again.');

  } catch (error) {
    console.error('❌ Error unblocking localhost:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('📝 Database connection closed');
    process.exit(0);
  }
}

// Run the unblock function
unblockLocalhost();