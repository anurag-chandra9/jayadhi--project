// waf/alert.js

const nodemailer = require('nodemailer');

// Replace with your credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'niranjanmemane47@gmail.com',
    pass: 'iwtk lhni uior rxkl' // Use App Password, not raw password
  }
});

function sendAlert(subject, message) {
  const mailOptions = {
    from: '"Jayadhi WAF Alert" <niranjanmemane47L@gmail.com>',
    to: 'poojamemane17@gmail.com',
    subject,
    text: message
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.error("[Alert Error]", error);
    else console.log("[Alert Sent]", info.response);
  });
}

module.exports = sendAlert;
