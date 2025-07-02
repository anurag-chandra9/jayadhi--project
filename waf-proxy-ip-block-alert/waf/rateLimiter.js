// waf/rateLimiter.js

const { RateLimiterMemory } = require('rate-limiter-flexible');
const fs = require('fs');
const path = require('path');
const { blockIP, isBlocked } = require('./ipBlocklist');
const sendAlert = require('./alert');

const rateLimiter = new RateLimiterMemory({
    points: 100,
    duration: 60,
    blockDuration: 3600, // block for 1 hour after exceeding limit
});

const rateLimiterMiddleware = async (req, res, next) => {
    const ip = req.ip;

    if (isBlocked(ip)) {
        return res.status(403).send('Your IP is blocked by the WAF.');
    }

    try {
        await rateLimiter.consume(ip);
        next();
    } catch {
        // Exceeded rate limit: potential DDoS / brute force
        blockIP(ip);
        const targetIP = req.headers.host;
        const log = `[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}] BLOCKED - SourceIP:${ip} - TargetIP:${targetIP} - Reason: DDoS/Brute Force\n`;
        fs.appendFileSync(path.join(__dirname, '../logs/attacks.log'), log);

        sendAlert("Jayadhi Security: IP Blocked (DDoS/Brute Force)", `Blocked IP: ${ip} exceeded rate limits, suspected DDoS or brute force.`);

        res.status(429).send('Too Many Requests - Your IP has been blocked for suspected abuse.');
    }
};

module.exports = rateLimiterMiddleware;
