const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const User = require('../../server/models/userModel'); 
const Asset = require('../../server/models/assetModel'); 
require('dotenv').config({ path: __dirname + '/../.env' });

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("[MongoDB] Connected successfully."))
    .catch((err) => console.error("[MongoDB] Connection error:", err));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'niranjanmemane47@gmail.com',
    pass: 'iwtk lhni uior rxkl'
  }
});

async function sendAlert(subject, message, targetIP) {
  try {
    const asset = await Asset.findOne({ ip: targetIP }).populate('user');
    const recipientEmail = asset?.user?.email || 'securityteam@jayadhi.com';

    const mailOptions = {
      from: 'Jayadhi WAF Alert <niranjanmemane47@gmail.com>',
      to: recipientEmail,
      subject,
      text: message
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('[Alert Sent]', info.response);
  } catch (error) {
    console.error('[Alert Error]', error);
  }
}

module.exports = sendAlert;