// waf/ipBlocklist.js


const fs = require('fs');
const path = require('path');

const blockedIPs = new Set();

function loadBlockedIPsFromLogs() {
    const logPath = path.join(__dirname, '../logs/attacks.log');
    if (fs.existsSync(logPath)) {
        const data = fs.readFileSync(logPath, 'utf8');
        const regex = /IP:([0-9.:]+)/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
            blockedIPs.add(match[1]);
        }
        console.log(`[IPBlocklist] Loaded ${blockedIPs.size} blocked IPs from logs.`);
    }
}

function blockIP(ip) {
    blockedIPs.add(ip);
    console.log(`[IPBlocklist] IP ${ip} blocked.`);
}

function isBlocked(ip) {
    return blockedIPs.has(ip);
}

module.exports = { blockIP, isBlocked, loadBlockedIPsFromLogs };
