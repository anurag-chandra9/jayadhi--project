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

// Generate PDF report matching the insurance template exactly with improved formatting
const generateInsurancePDFReport = (incidentData, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 20, // Reduced margin
        size: 'A4',
        layout: 'portrait'
      });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      let yPosition = 25; // Reduced starting position
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 40; // Account for smaller margins
      const leftMargin = 20; // Reduced margin

      // Helper function to add table cell with border
      const addTableCell = (text, x, y, width, height, options = {}) => {
        const {
          backgroundColor = null,
          textColor = '#000',
          fontSize = 9, // Reduced default font size
          align = 'left',
          bold = false,
          padding = 4 // Reduced padding
        } = options;

        // Draw background if any
        if (backgroundColor) {
          doc.rect(x, y, width, height)
            .fillColor(backgroundColor)
            .fill();
        }

        // Draw border
        doc.rect(x, y, width, height)
          .strokeColor('#000')
          .lineWidth(0.5)
          .stroke();

        // Add text with better line height
        doc.fillColor(textColor)
          .fontSize(fontSize)
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(text || '', x + padding, y + padding, {
            width: width - padding * 2,
            align,
            lineGap: 1, // Reduced line gap
            height: height - padding * 2
          });

        return y + height;
      };

      // Helper function to add section header (non-table)
      const addSectionHeader = (title, fontSize = 11) => { // Reduced font size
        doc.fontSize(fontSize)
          .fillColor('#000')
          .font('Helvetica-Bold')
          .text(title, leftMargin, yPosition, { width: contentWidth });

        yPosition += fontSize + 4; // Reduced spacing
        doc.font('Helvetica'); // Reset to normal font
      };

      // Helper function to add simple text fields (for Company Info and Insurance sections)
      const addSimpleField = (label, value) => {
        doc.fontSize(9) // Reduced font size
          .fillColor('#000')
          .font('Helvetica')
          .text(`${label} ${value || '____________________'}`, leftMargin, yPosition, { width: contentWidth });

        yPosition += 12; // Reduced spacing
      };

      // Main title
      doc.fontSize(18) // Reduced font size
        .fillColor('#ca3232')
        .font('Helvetica-Bold')
        .text('Cybersecurity Incident Report', leftMargin, yPosition, {
          align: 'center',
          width: contentWidth
        });

      yPosition += 25; // Reduced spacing

      // Company Information Section
      addSectionHeader('Company Information');

      addSimpleField('Company Name:', incidentData.companyName);
      addSimpleField('Business Address:', incidentData.businessAddress);
      addSimpleField('Contact Person Name:', incidentData.contactPersonName);
      addSimpleField('Contact Email:', incidentData.contactEmail);
      addSimpleField('Contact Phone:', incidentData.contactPhone);

      yPosition += 3; // Reduced spacing

      // Insurance Policy Details Section
      addSectionHeader('Insurance Policy Details');

      addSimpleField('Insurance Provider:', incidentData.insuranceProvider);
      addSimpleField('Policy Number:', incidentData.policyNumber);
      addSimpleField('Coverage Type:', incidentData.coverageType);

      yPosition += 3; // Reduced spacing

      // Incident Description Table with improved widths
      const tableStartY = yPosition;
      const cellHeight = 20; // Reduced cell height
      const fullWidth = contentWidth;
      
      // Better width distribution
      const col1Width = contentWidth * 0.25;  // 25% for labels
      const col2Width = contentWidth * 0.25;  // 25% for values
      const col3Width = contentWidth * 0.25;  // 25% for labels
      const col4Width = contentWidth * 0.25;  // 25% for values

      // Header row - "Incident Description"
      yPosition = addTableCell('Incident Description', leftMargin, yPosition, fullWidth, cellHeight, {
        backgroundColor: '#ffbdbd',
        textColor: '#aa1313',
        fontSize: 11,
        bold: true,
        align: 'center'
      });

      // Row 1: Incident ID | [value] | Incident Title | [value]
      const row1Y = yPosition;
      addTableCell('Incident ID', leftMargin, row1Y, col1Width, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.incidentId || '', leftMargin + col1Width, row1Y, col2Width, cellHeight, { fontSize: 9 });
      addTableCell('Incident Title', leftMargin + col1Width + col2Width, row1Y, col3Width, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.incidentTitle || '', leftMargin + col1Width + col2Width + col3Width, row1Y, col4Width, cellHeight, { fontSize: 9 });
      yPosition = row1Y + cellHeight;

      // Row 2: Severity Level | [value] | Incident Type | [value]
      const row2Y = yPosition;
      addTableCell('Severity Level', leftMargin, row2Y, col1Width, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.severityLevel || '', leftMargin + col1Width, row2Y, col2Width, cellHeight, { fontSize: 9 });
      addTableCell('Incident Type', leftMargin + col1Width + col2Width, row2Y, col3Width, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.incidentType || '', leftMargin + col1Width + col2Width + col3Width, row2Y, col4Width, cellHeight, { fontSize: 9 });
      yPosition = row2Y + cellHeight;

      // Row 3: Date of Incident | [value] | Time of Incident | [value]
      const row3Y = yPosition;
      addTableCell('Date of Incident', leftMargin, row3Y, col1Width, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.incidentDate || '', leftMargin + col1Width, row3Y, col2Width, cellHeight, { fontSize: 9 });
      addTableCell('Time of Incident', leftMargin + col1Width + col2Width, row3Y, col3Width, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.incidentTime || '', leftMargin + col1Width + col2Width + col3Width, row3Y, col4Width, cellHeight, { fontSize: 9 });
      yPosition = row3Y + cellHeight;

      // Row 4: Affected Assets - full width for better space
      const row4Y = yPosition;
      const affectedAssetsLabelWidth = contentWidth * 0.25;  
      const affectedAssetsValueWidth = contentWidth * 0.75; 
      
      addTableCell('Affected Assets', leftMargin, row4Y, affectedAssetsLabelWidth, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.affectedAssets || '', leftMargin + affectedAssetsLabelWidth, row4Y, affectedAssetsValueWidth, cellHeight, { fontSize: 9 });
      yPosition = row4Y + cellHeight;

      // Row 5: How was the incident discovered - adjusted width
      const row5Y = yPosition;
      const discoveryLabelWidth = contentWidth * 0.4;  // 40% for label
      const discoveryValueWidth = contentWidth * 0.6;  // 60% for value

      addTableCell('How was the incident discovered', leftMargin, row5Y, discoveryLabelWidth, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.discoveryMethod || '', leftMargin + discoveryLabelWidth, row5Y, discoveryValueWidth, cellHeight, { fontSize: 9 });
      yPosition = row5Y + cellHeight;

      // Row 6: Description of Incident (reduced height) - better proportions
      const row6Y = yPosition;
      const descHeight = 50; // Reduced height
      const descLabelWidth = contentWidth * 0.25;  // 25% for label
      const descValueWidth = contentWidth * 0.75;  // 75% for value
      
      addTableCell('Description of Incident', leftMargin, row6Y, descLabelWidth, descHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.estimatedImpact || '', leftMargin + descLabelWidth, row6Y, descValueWidth, descHeight, { fontSize: 9 });
      yPosition = row6Y + descHeight;

      // Row 7: Status | [value] | Actions Taken | [value]
      const row7Y = yPosition;
      addTableCell('Status', leftMargin, row7Y, col1Width, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.status || '', leftMargin + col1Width, row7Y, col2Width, cellHeight, { fontSize: 9 });
      addTableCell('Actions Taken', leftMargin + col1Width + col2Width, row7Y, col3Width, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.actionsTaken || '', leftMargin + col1Width + col2Width + col3Width, row7Y, col4Width, cellHeight, { fontSize: 9 });
      yPosition = row7Y + cellHeight;

      // Row 8: Was law enforcement notified - adjusted width
      const row8Y = yPosition;
      const lawEnforcementLabelWidth = contentWidth * 0.5;  // 50% for label
      const lawEnforcementValueWidth = contentWidth * 0.5;  // 50% for value

      addTableCell('Was law enforcement notified (Yes/No)', leftMargin, row8Y, lawEnforcementLabelWidth, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.lawEnforcementNotified || '', leftMargin + lawEnforcementLabelWidth, row8Y, lawEnforcementValueWidth, cellHeight, { fontSize: 9 });
      yPosition = row8Y + cellHeight;

      // Row 9: Agency Name | [value] | Reference Number | [value]
      const row9Y = yPosition;
      addTableCell('Agency Name', leftMargin, row9Y, col1Width, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.agencyName || '', leftMargin + col1Width, row9Y, col2Width, cellHeight, { fontSize: 9 });
      addTableCell('Reference Number', leftMargin + col1Width + col2Width, row9Y, col3Width, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.referenceNumber || '', leftMargin + col1Width + col2Width + col3Width, row9Y, col4Width, cellHeight, { fontSize: 9 });
      yPosition = row9Y + cellHeight;

      // Header row - "Estimated Impact"
      yPosition = addTableCell('Estimated Impact', leftMargin, yPosition, fullWidth, cellHeight, {
        backgroundColor: '#ffbdbd',
        textColor: '#aa1313',
        fontSize: 11,
        bold: true,
        align: 'center'
      });

      // Row 10: Estimated Financial Loss (Rs.) - adjusted width
      const row10Y = yPosition;
      const financialLossLabelWidth = contentWidth * 0.3; 
      const financialLossValueWidth = contentWidth * 0.7; 

      addTableCell('Estimated Financial Loss (Rs.)', leftMargin, row10Y, financialLossLabelWidth, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.financialLoss || '', leftMargin + financialLossLabelWidth, row10Y, financialLossValueWidth, cellHeight, { fontSize: 9 });
      yPosition = row10Y + cellHeight;

      // Row 11: Downtime Experienced (hours) - adjusted width
      const row11Y = yPosition;
      const downtimeLabelWidth = contentWidth * 0.3; 
      const downtimeValueWidth = contentWidth * 0.7;  

      addTableCell('Downtime Experienced (hours)', leftMargin, row11Y, downtimeLabelWidth, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.downtimeHours || '', leftMargin + downtimeLabelWidth, row11Y, downtimeValueWidth, cellHeight, { fontSize: 9 });
      yPosition = row11Y + cellHeight;

      // Row 12: Data Compromised - better proportions
      const row12Y = yPosition;
      const dataCompromisedLabelWidth = contentWidth * 0.25;  // 25% for label
      const dataCompromisedValueWidth = contentWidth * 0.75;  // 75% for value
      
      addTableCell('Data Compromised', leftMargin, row12Y, dataCompromisedLabelWidth, cellHeight, { fontSize: 9, bold: true });
      addTableCell(incidentData.dataCompromised || '', leftMargin + dataCompromisedLabelWidth, row12Y, dataCompromisedValueWidth, cellHeight, { fontSize: 9 });
      yPosition = row12Y + cellHeight;

      // Header row - "Evidence"
      yPosition = addTableCell('Evidence', leftMargin, yPosition, fullWidth, cellHeight, {
        backgroundColor: '#ffbdbd',
        textColor: '#aa1313',
        fontSize: 11,
        bold: true,
        align: 'center'
      });

      // Row 13: drive link - better proportions
      const row13Y = yPosition;
      const evidenceLabelWidth = contentWidth * 0.2;  // 20% for label
      const evidenceValueWidth = contentWidth * 0.8;  // 80% for value

      addTableCell('drive link', leftMargin, row13Y, evidenceLabelWidth, cellHeight, { fontSize: 9, bold: true });

      const evidenceText = incidentData.evidenceLink
        ? `• [screenshot drive link] - ${incidentData.evidenceLink}`
        : '• [screenshot drive link] -';

      addTableCell(evidenceText, leftMargin + evidenceLabelWidth, row13Y, evidenceValueWidth, cellHeight, {
        fontSize: 9,
        align: 'left'
      });

      yPosition = row13Y + cellHeight;

      yPosition += 30; 

      // Declaration - compact version
      doc.fontSize(9) // Reduced font size
        .fillColor('#000')
        .font('Helvetica-Bold')
        .text(
          'I hereby declare that the information provided above is true to the best of my knowledge and understand that false claims may lead to denial of the insurance claim.',
          leftMargin,
          yPosition,
          {
            width: contentWidth,
            align: 'justify',
            lineGap: 1
          }
        );

      yPosition += 40; 

      // Signature fields with compact spacing
      doc.font('Helvetica')
        .fontSize(9);

      doc.text(`Authorized Signatory Name: ${incidentData.authorizedSignatoryName || '____________________'}`, leftMargin, yPosition);
      yPosition += 12;

      doc.text(`Designation: ${incidentData.designation || '____________________'}`, leftMargin, yPosition);
      yPosition += 12;

      doc.text(`Signature (digital/typed): ${incidentData.signature || '____________________'}`, leftMargin, yPosition);
      yPosition += 80;

      // Compact Footer
      doc.fontSize(8) // Reduced font size
        .fillColor('gray')
        .font('Helvetica')
        .text('This report is generated automatically by the Cybersecurity Platform',
          leftMargin, yPosition, {
          align: 'center',
          width: contentWidth
        });

      doc.text('For questions or clarifications, please contact the IT Security Team',
        leftMargin, yPosition + 10, {
        align: 'center',
        width: contentWidth
      });

      doc.text(`Report Generated: ${new Date().toLocaleString()}`,
        leftMargin, yPosition + 20, {
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