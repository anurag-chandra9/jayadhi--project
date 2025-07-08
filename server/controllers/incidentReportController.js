const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Ensure reports directory exists
const ensureReportsDirectory = () => {
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  return reportsDir;
};

// Generate PDF report
const generatePDFReport = (incidentData, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      // Header
      doc.fontSize(20)
         .fillColor('#dc3545')
         .text('CYBERSECURITY INCIDENT REPORT', 50, 50, { align: 'center' });
      
      doc.moveDown();
      
      // Report metadata
      doc.fontSize(12)
         .fillColor('#666')
         .text(`Report Generated: ${new Date().toLocaleString()}`, 50, doc.y, { align: 'right' });
      
      doc.moveDown(2);

      // Incident details section
      doc.fontSize(16)
         .fillColor('#000')
         .text('INCIDENT DETAILS', 50, doc.y);
      
      doc.moveDown();
      
      // Add line separator
      doc.moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .strokeColor('#ddd')
         .stroke();
      
      doc.moveDown();

      // Incident information
      const addField = (label, value) => {
        doc.fontSize(12)
           .fillColor('#333')
           .text(`${label}:`, 50, doc.y, { continued: true })
           .fillColor('#000')
           .text(` ${value || 'Not specified'}`, { continued: false });
        doc.moveDown(0.5);
      };

      addField('Incident Title', incidentData.title);
      addField('Incident ID', incidentData.incidentId || `INC-${Date.now()}`);
      addField('Reported By', incidentData.reportedBy || 'System Administrator');
      addField('Incident Date', incidentData.timestamp ? new Date(incidentData.timestamp).toLocaleString() : new Date().toLocaleString());
      addField('Severity Level', incidentData.severity || 'Medium');
      addField('Incident Type', incidentData.type || 'Security Incident');
      addField('Status', incidentData.status || 'Open');

      doc.moveDown();

      // Description section
      doc.fontSize(14)
         .fillColor('#000')
         .text('DESCRIPTION', 50, doc.y);
      
      doc.moveDown(0.5);
      
      doc.fontSize(11)
         .fillColor('#333')
         .text(incidentData.description || 'No description provided', 50, doc.y, {
           width: 500,
           align: 'justify'
         });

      doc.moveDown(2);

      // Affected assets section
      if (incidentData.affectedAssets && incidentData.affectedAssets.length > 0) {
        doc.fontSize(14)
           .fillColor('#000')
           .text('AFFECTED ASSETS', 50, doc.y);
        
        doc.moveDown(0.5);
        
        incidentData.affectedAssets.forEach((asset, index) => {
          doc.fontSize(11)
             .fillColor('#333')
             .text(`${index + 1}. ${asset}`, 70, doc.y);
          doc.moveDown(0.3);
        });
      }

      doc.moveDown(2);

      // Impact assessment
      if (incidentData.impact) {
        doc.fontSize(14)
           .fillColor('#000')
           .text('IMPACT ASSESSMENT', 50, doc.y);
        
        doc.moveDown(0.5);
        
        doc.fontSize(11)
           .fillColor('#333')
           .text(incidentData.impact, 50, doc.y, {
             width: 500,
             align: 'justify'
           });
        
        doc.moveDown(2);
      }

      // Immediate actions taken
      if (incidentData.immediateActions) {
        doc.fontSize(14)
           .fillColor('#000')
           .text('IMMEDIATE ACTIONS TAKEN', 50, doc.y);
        
        doc.moveDown(0.5);
        
        doc.fontSize(11)
           .fillColor('#333')
           .text(incidentData.immediateActions, 50, doc.y, {
             width: 500,
             align: 'justify'
           });
        
        doc.moveDown(2);
      }

      // Recommendations
      if (incidentData.recommendations) {
        doc.fontSize(14)
           .fillColor('#000')
           .text('RECOMMENDATIONS', 50, doc.y);
        
        doc.moveDown(0.5);
        
        doc.fontSize(11)
           .fillColor('#333')
           .text(incidentData.recommendations, 50, doc.y, {
             width: 500,
             align: 'justify'
           });
        
        doc.moveDown(2);
      }

      // Footer
      doc.fontSize(10)
         .fillColor('#666')
         .text('This report is generated automatically by the Cybersecurity Platform', 50, doc.page.height - 100, {
           align: 'center',
           width: 500
         });

      doc.text('For questions or clarifications, please contact the IT Security Team', 50, doc.y + 10, {
        align: 'center',
        width: 500
      });

      doc.end();

      stream.on('finish', () => {
        resolve(filePath);
      });

      stream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

// Send email with PDF attachment
const sendIncidentReport = async (incidentData, pdfPath) => {
  try {
    const mailOptions = {
      from: `"Cybersecurity Platform" <${process.env.EMAIL_USER}>`,
      to: process.env.INSURANCE_EMAIL,
      subject: `🚨 Cybersecurity Incident Report - ${incidentData.title || 'Security Incident'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #dc3545; margin: 0;">🚨 Cybersecurity Incident Report</h2>
            <p style="color: #6c757d; margin: 5px 0;">Automated incident notification</p>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #dee2e6; margin-top: 10px;">
            <h3 style="color: #333; margin-top: 0;">Incident Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Incident Title:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${incidentData.title || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Incident Date:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${incidentData.timestamp ? new Date(incidentData.timestamp).toLocaleString() : new Date().toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Severity:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${incidentData.severity || 'Medium'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Reported By:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${incidentData.reportedBy || 'System Administrator'}</td>
              </tr>
            </table>
            
            <h4 style="color: #333; margin-top: 20px;">Description:</h4>
            <p style="color: #666; background: #f8f9fa; padding: 15px; border-radius: 4px;">
              ${incidentData.description || 'No description provided'}
            </p>
            
            ${incidentData.affectedAssets && incidentData.affectedAssets.length > 0 ? `
              <h4 style="color: #333;">Affected Assets:</h4>
              <ul style="color: #666;">
                ${incidentData.affectedAssets.map(asset => `<li>${asset}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
          
          <div style="background: #e9ecef; padding: 15px; margin-top: 10px; border-radius: 4px; font-size: 14px; color: #495057;">
            <strong>📎 Attachment:</strong> Please find the detailed incident report attached as a PDF document.
            <br><br>
            <strong>⚠️ Action Required:</strong> Please review this incident report and take appropriate action as per your incident response procedures.
          </div>
        </div>
      `,
      attachments: [
        {
          filename: path.basename(pdfPath),
          path: pdfPath,
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Main controller function
const reportIncident = async (req, res) => {
  try {
    const {
      title,
      description,
      affectedAssets,
      timestamp,
      severity,
      type,
      status,
      reportedBy,
      impact,
      immediateActions,
      recommendations
    } = req.body;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required fields'
      });
    }

    // Generate incident ID
    const incidentId = `INC-${Date.now()}`;
    
    // Prepare incident data
    const incidentData = {
      incidentId,
      title,
      description,
      affectedAssets: Array.isArray(affectedAssets) ? affectedAssets : [],
      timestamp: timestamp || new Date().toISOString(),
      severity: severity || 'Medium',
      type: type || 'Security Incident',
      status: status || 'Open',
      reportedBy: reportedBy || 'System Administrator',
      impact,
      immediateActions,
      recommendations
    };

    // Ensure reports directory exists
    const reportsDir = ensureReportsDirectory();
    
    // Generate PDF filename
    const pdfFileName = `incident_report_${incidentId}_${Date.now()}.pdf`;
    const pdfPath = path.join(reportsDir, pdfFileName);

    // Generate PDF report
    console.log('Generating PDF report...');
    await generatePDFReport(incidentData, pdfPath);

    // Send email with PDF attachment
    console.log('Sending incident report email...');
    const emailInfo = await sendIncidentReport(incidentData, pdfPath);

    // Log success
    console.log(`Incident report sent successfully. Email ID: ${emailInfo.messageId}`);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Incident report generated and sent successfully',
      data: {
        incidentId,
        reportPath: pdfPath,
        emailSent: true,
        emailId: emailInfo.messageId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing incident report:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to process incident report',
      error: error.message
    });
  }
};

module.exports = {
  reportIncident
};