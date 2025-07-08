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

// Generate PDF report matching the insurance template
const generateInsurancePDFReport = (incidentData, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 30,
        size: 'A4',
        layout: 'portrait'
      });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);

      let yPosition = 30;
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 60; // Account for margins
      
      // Helper function to add a field with label and value
      const addField = (label, value, fontSize = 9) => {
        const labelWidth = 180;
        const valueWidth = contentWidth - labelWidth - 10;
        
        doc.fontSize(fontSize)
           .fillColor('#000')
           .text(label, 30, yPosition, { width: labelWidth, align: 'left' })
           .text(value || 'Not provided', 30 + labelWidth + 10, yPosition, { width: valueWidth, align: 'left' });
        
        yPosition += fontSize + 3;
      };

      // Helper function to add section header
      const addSectionHeader = (title, fontSize = 12) => {
        if (yPosition > 700) { // Check if we need more space
          doc.fontSize(8).fillColor('#666').text('...continued on next page...', 30, yPosition);
          doc.addPage();
          yPosition = 30;
        }
        
        doc.fontSize(fontSize)
           .fillColor('#000')
           .font('Helvetica-Bold')
           .text(title, 30, yPosition);
        
        yPosition += fontSize + 8;
        
        // Add horizontal line
        doc.moveTo(30, yPosition)
           .lineTo(pageWidth - 30, yPosition)
           .strokeColor('#ccc')
           .lineWidth(0.5)
           .stroke();
        
        yPosition += 8;
        doc.font('Helvetica'); // Reset to normal font
      };

      // Header
      doc.fontSize(16)
         .fillColor('#dc3545')
         .font('Helvetica-Bold')
         .text('CYBERSECURITY INCIDENT REPORT', 30, yPosition, { 
           align: 'center',
           width: contentWidth
         });
      
      yPosition += 25;
      
      // Report metadata (top right)
      doc.fontSize(8)
         .fillColor('#666')
         .font('Helvetica')
         .text(`Report Generated: ${new Date().toLocaleString()}`, 30, yPosition, { 
           align: 'right',
           width: contentWidth
         });
      
      yPosition += 20;

      // Company Information Section
      addSectionHeader('Company Information');
      addField('Company Name:', incidentData.companyName);
      addField('Business Address:', incidentData.businessAddress);
      addField('Contact Person Name:', incidentData.contactPersonName);
      addField('Contact Email:', incidentData.contactEmail);
      addField('Contact Phone:', incidentData.contactPhone);
      
      yPosition += 5;

      // Insurance Policy Details Section
      addSectionHeader('Insurance Policy Details');
      addField('Insurance Provider:', incidentData.insuranceProvider);
      addField('Policy Number:', incidentData.policyNumber);
      addField('Coverage Type:', incidentData.coverageType);
      
      yPosition += 5;

      // Incident Details Section
      addSectionHeader('Incident Details');
      addField('Incident ID:', incidentData.incidentId);
      addField('Incident Title:', incidentData.incidentTitle);
      addField('Date of Incident:', incidentData.incidentDate);
      addField('Time of Incident:', incidentData.incidentTime);
      addField('Severity Level:', incidentData.severityLevel);
      addField('Incident Type:', incidentData.incidentType);
      addField('Status:', incidentData.status);
      
      yPosition += 5;

      // Description of Incident Section
      addSectionHeader('Description of Incident');
      addField('Affected Assets:', incidentData.affectedAssets);
      addField('How was the incident discovered:', incidentData.discoveryMethod);
      addField('Estimated Impact:', incidentData.estimatedImpact);
      addField('Estimated Financial Loss (Rs.):', incidentData.financialLoss);
      addField('Downtime Experienced (hours):', incidentData.downtimeHours);
      addField('Data Compromised:', incidentData.dataCompromised);
      addField('Evidence (Drive Link):', incidentData.evidenceLink);
      addField('Actions Taken:', incidentData.actionsTaken);
      
      yPosition += 5;

      // Law Enforcement Notification Section
      addSectionHeader('Law Enforcement Notification');
      addField('Was law enforcement notified (Yes/No):', incidentData.lawEnforcementNotified);
      addField('Agency Name:', incidentData.agencyName);
      addField('Reference Number:', incidentData.referenceNumber);
      
      yPosition += 10;

      // Legal Declaration Section
      addSectionHeader('Legal Declaration');
      
      // Declaration text
      doc.fontSize(8)
         .fillColor('#000')
         .text('I hereby declare that the information provided above is true to the best of my knowledge and understand that false claims may lead to denial of the insurance claim.', 
               30, yPosition, { 
                 width: contentWidth,
                 align: 'justify'
               });
      
      yPosition += 20;

      // Signature fields
      addField('Authorized Signatory Name:', incidentData.authorizedSignatoryName);
      addField('Designation:', incidentData.designation);
      addField('Signature (digital/typed):', incidentData.signature);
      
      yPosition += 15;

      // Footer
      doc.fontSize(8)
         .fillColor('#666')
         .text('This report is generated automatically by the Cybersecurity Platform', 
               30, doc.page.height - 60, {
                 align: 'center',
                 width: contentWidth
               });

      doc.text('For questions or clarifications, please contact the IT Security Team', 
               30, doc.page.height - 45, {
                 align: 'center',
                 width: contentWidth
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
      subject: `🚨 Cybersecurity Insurance Claim Report - ${incidentData.incidentTitle || 'Security Incident'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #dc3545; margin: 0;">🚨 Cybersecurity Insurance Claim Report</h2>
            <p style="color: #6c757d; margin: 5px 0;">Incident ID: ${incidentData.incidentId}</p>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #dee2e6; margin-top: 10px;">
            <h3 style="color: #333; margin-top: 0;">Incident Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Company:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${incidentData.companyName || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Incident Title:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${incidentData.incidentTitle || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Date & Time:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${incidentData.incidentDate || 'Not specified'} ${incidentData.incidentTime || ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Severity:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${incidentData.severityLevel || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Financial Loss:</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">Rs. ${incidentData.financialLoss || 'Not specified'}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #e9ecef; padding: 15px; margin-top: 10px; border-radius: 4px; font-size: 14px; color: #495057;">
            <strong>📎 Attachment:</strong> Please find the complete cybersecurity insurance claim report attached as a PDF document.
            <br><br>
            <strong>⚠️ Action Required:</strong> Please review this incident report and process the insurance claim as per your procedures.
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
      // Company Information
      companyName,
      businessAddress,
      contactPersonName,
      contactEmail,
      contactPhone,
      
      // Insurance Policy Details
      insuranceProvider,
      policyNumber,
      coverageType,
      
      // Incident Details
      incidentTitle,
      incidentDate,
      incidentTime,
      severityLevel,
      incidentType,
      status,
      
      // Description of Incident
      affectedAssets,
      discoveryMethod,
      estimatedImpact,
      financialLoss,
      downtimeHours,
      dataCompromised,
      evidenceLink,
      actionsTaken,
      
      // Law Enforcement Notification
      lawEnforcementNotified,
      agencyName,
      referenceNumber,
      
      // Legal Declaration
      authorizedSignatoryName,
      designation,
      signature,
      
      // Optional: Send email flag
      sendEmail
    } = req.body;

    // Validate required fields
    if (!companyName || !incidentTitle || !contactEmail) {
      return res.status(400).json({
        success: false,
        message: 'Company name, incident title, and contact email are required fields'
      });
    }

    // Generate incident ID
    const incidentId = `INC-${Date.now()}`;
    
    // Prepare incident data with all fields
    const incidentData = {
      incidentId,
      
      // Company Information
      companyName,
      businessAddress,
      contactPersonName,
      contactEmail,
      contactPhone,
      
      // Insurance Policy Details
      insuranceProvider,
      policyNumber,
      coverageType,
      
      // Incident Details
      incidentTitle,
      incidentDate: incidentDate || new Date().toLocaleDateString(),
      incidentTime: incidentTime || new Date().toLocaleTimeString(),
      severityLevel: severityLevel || 'Medium',
      incidentType: incidentType || 'Security Incident',
      status: status || 'Open',
      
      // Description of Incident
      affectedAssets: Array.isArray(affectedAssets) ? affectedAssets.join(', ') : affectedAssets,
      discoveryMethod,
      estimatedImpact,
      financialLoss,
      downtimeHours,
      dataCompromised,
      evidenceLink,
      actionsTaken,
      
      // Law Enforcement Notification
      lawEnforcementNotified: lawEnforcementNotified || 'No',
      agencyName,
      referenceNumber,
      
      // Legal Declaration
      authorizedSignatoryName,
      designation,
      signature
    };

    // Ensure reports directory exists
    const reportsDir = ensureReportsDirectory();
    
    // Generate PDF filename
    const pdfFileName = `incident_report_${incidentId}.pdf`;
    const pdfPath = path.join(reportsDir, pdfFileName);

    // Generate PDF report
    console.log('Generating insurance PDF report...');
    await generateInsurancePDFReport(incidentData, pdfPath);

    let emailInfo = null;
    
    // Send email if requested
    if (sendEmail && process.env.INSURANCE_EMAIL) {
      try {
        console.log('Sending incident report email...');
        emailInfo = await sendIncidentReport(incidentData, pdfPath);
        console.log(`Incident report sent successfully. Email ID: ${emailInfo.messageId}`);
      } catch (emailError) {
        console.error('Failed to send email:', emailError.message);
        // Don't fail the entire request if email fails
      }
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Incident report generated successfully',
      incidentId,
      reportFileName: pdfFileName,
      timestamp: new Date().toISOString(),
      emailSent: emailInfo ? true : false,
      emailId: emailInfo ? emailInfo.messageId : null
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