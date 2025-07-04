// waf-proxy/server.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const wafMiddleware = require('./waf/wafMiddleware');
const rateLimiterMiddleware = require('./waf/rateLimiter');
const { loadBlockedIPsFromLogs } = require('./waf/ipBlocklist');

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(helmet());
app.use(bodyParser.json());

// Load previously blocked IPs before handling any requests
loadBlockedIPsFromLogs();

// === SECURITY LAYERS ===
app.use(rateLimiterMiddleware);
app.use(wafMiddleware);


// === MULTIPLE TARGETS ===

/**
 * Mapping:
 * - 'xyz.com' => example SME A (192.168.1.100:5000)
 * - 'abc.com' => example SME B (192.168.1.101:5000)
 * - 'localhost' => 1st Enterprise Localhost for simulation #1 (localhost:5000)
 * - '127.0.0.1' => 2nd Enterprise Localhost fro simulation #2 (localhost:5001)
 */

const targets = {
    'xyz.com': 'http://192.168.1.100:5000',
    'abc.com': 'http://192.168.1.101:5000',
    'localhost': 'http://localhost:5000',
    '127.0.0.1': 'http://localhost:5001'
};

// === LOGS VIEW ===
app.get('/logs', (req, res) => {
    const logs = fs.readFileSync(path.join(__dirname, './logs/attacks.log'), 'utf8');
    res.type('text').send(logs);
});


app.use((req, res, next) => {
    const host = req.headers.host.split(':')[0];
    const target = targets[host];

    if (!target) {
        console.log(` No target found for ${host}. Using default.`);
        res.status(502).send('Bad Gateway: No target server configured.');
        return;
    }

    console.log(`[Proxy] Forwarding ${req.method} ${req.url} -> ${target}`);

    return createProxyMiddleware({
        target,
        changeOrigin: true,
        onProxyReq(proxyReq, req) {
            console.log(`[ProxyReq] ${req.method} ${req.url} -> ${target}`);
        }
    })(req, res, next);
});


// === START SERVER ===
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`WAF proxy server running on http://localhost:${PORT}`));
