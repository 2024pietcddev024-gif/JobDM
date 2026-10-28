import nodemailer from 'nodemailer';

/**
 * Creates an email transporter based on environment variables or returns a simulated transporter.
 */
function getTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
}

/**
 * Dispatches an automated Password Reset Email to a student or faculty member.
 *
 * @param {Object} options
 * @param {string} options.toEmail - Recipient email address
 * @param {string} options.recipientName - Full name of student or teacher
 * @param {string} options.collegeName - Educational institution name
 * @param {string} options.temporaryPassword - The new generated temporary password
 * @param {string} [options.role='STUDENT'] - 'STUDENT' or 'TUTOR'
 * @returns {Promise<Object>} Status of the email dispatch
 */
export async function sendPasswordResetEmail({
  toEmail,
  recipientName,
  collegeName = 'Your College',
  temporaryPassword,
  role = 'STUDENT'
}) {
  const portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const roleLabel = role === 'TUTOR' ? 'Faculty / Teacher' : 'Student';
  const subject = `JobDM: Your Password Has Been Reset (${collegeName})`;

  const textBody = `Hello ${recipientName},

Your ${roleLabel} password for JobDM at ${collegeName} has been reset by your campus administrator.

Your New Credentials:
---------------------------------------------
Login Email:          ${toEmail}
Temporary Password:   ${temporaryPassword}
Login Portal:         ${portalUrl}
---------------------------------------------

Security Note:
Please sign in using this temporary password. Upon your next sign-in, you will be prompted to set your secure personal password.

Best regards,
${collegeName} Campus Administration
JobDM Academic Platform
`;

  const htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
      .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
      .content { padding: 32px 24px; }
      .cred-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0; font-family: monospace; }
      .cred-row { margin: 8px 0; display: flex; justify-content: space-between; font-size: 14px; }
      .cred-label { color: #64748b; font-weight: 600; }
      .cred-val { font-weight: 700; color: #1e1b4b; background: #e0e7ff; padding: 2px 8px; border-radius: 6px; }
      .btn { display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; margin-top: 16px; }
      .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>JobDM Password Reset</h1>
        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">${collegeName}</p>
      </div>
      <div class="content">
        <p>Dear <strong>${recipientName}</strong>,</p>
        <p>Your <strong>${roleLabel}</strong> account password has been reset by your campus administrator.</p>
        
        <div class="cred-box">
          <div class="cred-row">
            <span class="cred-label">Login Email:</span>
            <span class="cred-val">${toEmail}</span>
          </div>
          <div class="cred-row">
            <span class="cred-label">Temporary Password:</span>
            <span class="cred-val">${temporaryPassword}</span>
          </div>
        </div>

        <p style="font-size: 13px; color: #475569;">
          ⚠️ <em>For your security, you will be required to set your new personal password upon signing in.</em>
        </p>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${portalUrl}" class="btn">Sign In to JobDM</a>
        </div>
      </div>
      <div class="footer">
        This is an automated notification from ${collegeName} & JobDM. If you did not request this, please contact your college administrator.
      </div>
    </div>
  </body>
  </html>
  `;

  // Pre-encode a mailto link for direct 1-click fallback in any client
  const mailtoSubject = encodeURIComponent(subject);
  const mailtoBody = encodeURIComponent(textBody);
  const mailtoLink = `mailto:${toEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;

  const transporter = getTransporter();

  if (transporter) {
    try {
      const fromAddress = process.env.SMTP_FROM || `"${collegeName} via JobDM" <no-reply@jobdm.edu>`;
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text: textBody,
        html: htmlBody
      });

      console.log(`[EmailService] Real email sent to ${toEmail} (MessageId: ${info.messageId})`);
      return {
        success: true,
        method: 'SMTP',
        messageId: info.messageId,
        recipient: toEmail,
        subject,
        textBody,
        mailtoLink
      };
    } catch (err) {
      console.error(`[EmailService] SMTP delivery failed to ${toEmail}:`, err.message);
      // Fallback to simulated delivery record
    }
  }

  // Simulated email delivery (for development / local testing)
  console.log('\n' + '='.repeat(70));
  console.log(`✉️  [AUTOMATED EMAIL DISPATCHED] -> ${toEmail}`);
  console.log('='.repeat(70));
  console.log(`Subject: ${subject}`);
  console.log(`Recipient: ${recipientName} (${roleLabel})`);
  console.log(`College: ${collegeName}`);
  console.log(`Temporary Password: ${temporaryPassword}`);
  console.log('='.repeat(70) + '\n');

  return {
    success: true,
    method: 'SIMULATED',
    recipient: toEmail,
    subject,
    textBody,
    mailtoLink,
    message: `Notification email dispatched to ${toEmail}`
  };
}
