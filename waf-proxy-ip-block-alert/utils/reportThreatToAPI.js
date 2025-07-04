const axios = require('axios');
require('dotenv').config({ path: __dirname + '/../.env' });

async function reportThreatToAPI(threatData) {
  try {
    await axios.post('http://localhost:3000/api/threats/report', threatData, {
      headers: {
        Authorization: `Bearer ${process.env.SERVICE_API_KEY}`
      }
    });
    console.log('[Threat Ingested to Fullstack API]');
  } catch (err) {
    console.error('[Threat Ingestion Error]', err.message);
  }
}

module.exports = reportThreatToAPI;