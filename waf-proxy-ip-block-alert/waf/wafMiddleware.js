const fs = require('fs');
const path = require('path');
const { blockIP, isBlocked } = require('./ipBlocklist');
const sendAlert = require('./alert');
const reportThreatToAPI = require('../utils/reportThreatToAPI');
const resolveAssetIdByTargetIP = require('../utils/resolveAssetIdByTargetIP');

const wafMiddleware = async (req, res, next) => {
  const ip = req.ip;
  const userAgent = req.headers['user-agent'] || '';
  const body = JSON.stringify(req.body);
  const url = req.url + JSON.stringify(req.query);
  const targetIP = req.headers.host;

  if (isBlocked(ip)) {
    const log = `[${new Date().toISOString()}] BLOCKED - IP:${ip} - Reason: Already blocked\n`;
    fs.appendFileSync(path.join(__dirname, '../logs/attacks.log'), log);
    return res.status(403).send('Your IP is blocked by the WAF.');
  }

  const patterns = [
    /<script>/i, /select\s.*\sfrom/i, /union\s+select/i, /alert\s*\(/i,
    /<iframe/i, /or\s+1=1/i, /\.\.\//, /eval\s*\(/i,
    /<\?php/i, /<img\s+src\s*=\s*\"javascript:/i
  ];
  const blockedUserAgents = [/sqlmap/i, /nmap/i, /masscan/i];

  let detected = false;
  let reason = '';

  for (const pattern of patterns) {
    if (pattern.test(body) || pattern.test(url)) {
      detected = true;
      reason = `Malicious Pattern: ${pattern}`;
      break;
    }
  }

  if (!detected) {
    for (const uaPattern of blockedUserAgents) {
      if (uaPattern.test(userAgent)) {
        detected = true;
        reason = `Blocked User-Agent: ${userAgent}`;
        break;
      }
    }
  }

  if (detected) {
    blockIP(ip);

    const log = `[${new Date().toISOString()}] BLOCKED - SourceIP:${ip} - TargetIP:${targetIP} - Method:${req.method} - URL:${req.url} - UA:${userAgent} - Reason:${reason}\n`;
    fs.appendFileSync(path.join(__dirname, '../logs/attacks.log'), log);

    sendAlert('Jayadhi Security Model: Attack Blocked', `Blocked IP: ${ip}\nReason: ${reason}\nURL: ${req.url}\nUA: ${userAgent}`, targetIP);

    const assetId = await resolveAssetIdByTargetIP(targetIP);
    await reportThreatToAPI({
      threatType: reason,
      sourceIP: ip,
      assetId: assetId,
      timestamp: new Date(),
      confidenceScore: 0.9
    });

    return res.status(403).send('Malicious request blocked by WAF.');
  }

  next();
};

module.exports = wafMiddleware;