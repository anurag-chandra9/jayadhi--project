const { RateLimiterMemory } = require('rate-limiter-flexible');
const fs = require('fs');
const path = require('path');
const { blockIP, isBlocked } = require('./ipBlocklist');
const sendAlert = require('./alert');
const reportThreatToAPI = require('../utils/reportThreatToAPI');
const resolveAssetIdByTargetIP = require('../utils/resolveAssetIdByTargetIP');

const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
  blockDuration: 3600,
});

const rateLimiterMiddleware = async (req, res, next) => {
  const ip = req.ip;
  const targetIP = req.headers.host;

  if (isBlocked(ip)) {
    return res.status(403).send('Your IP is blocked by the WAF.');
  }

  try {
    await rateLimiter.consume(ip);
    next();
  } catch {
    blockIP(ip);

    const log = `[${new Date().toISOString()}] BLOCKED - SourceIP:${ip} - TargetIP:${targetIP} - Reason: DDoS/Brute Force\n`;
    fs.appendFileSync(path.join(__dirname, '../logs/attacks.log'), log);

    sendAlert('Jayadhi Security: IP Blocked (DDoS/Brute Force)', `Blocked IP: ${ip} exceeded rate limits, suspected DDoS or brute force.`, targetIP);

    const assetId = await resolveAssetIdByTargetIP(targetIP);
    await reportThreatToAPI({
      threatType: 'DDoS/Brute Force',
      sourceIP: ip,
      assetId: assetId,
      timestamp: new Date(),
      confidenceScore: 0.95
    });

    res.status(429).send('Too Many Requests - Your IP has been blocked for suspected abuse.');
  }
};

module.exports = rateLimiterMiddleware;
