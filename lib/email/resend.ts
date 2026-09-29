import { Resend } from 'resend';
import nodemailer from 'nodemailer';

interface SendOtpEmailParams {
  to: string;
  username: string;
  otp: string;
}

export async function sendOtpEmail({
  to,
  username,
  otp,
}: SendOtpEmailParams): Promise<{ success: boolean; error?: string }> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || `DCC CSE <${smtpUser}>`;

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'DCC CSE <onboarding@resend.dev>';

  if (!smtpUser && !resendApiKey) {
    console.error(
      `\n❌ [EMAIL SERVICE ERROR] Neither SMTP_USER nor RESEND_API_KEY is configured in .env.local!\n` +
      `Simulated OTP for user "${username}" (${to}): ${otp}\n`
    );
    return {
      success: false,
      error: 'Email service is not configured. Please add SMTP_USER/SMTP_PASSWORD or RESEND_API_KEY to your environment variables.',
    };
  }

  const subject = 'DCC CSE Password Reset Code';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
              <!-- Header -->
              <tr>
                <td style="padding: 32px 32px 20px; text-align: center; border-bottom: 1px solid #1f2937;">
                  <div style="display: inline-block; padding: 10px 14px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; margin-bottom: 12px;">
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">DCC CSE</span>
                  </div>
                  <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #f9fafb;">Student Academic Dashboard</h1>
                  <p style="margin: 6px 0 0; font-size: 13px; color: #9ca3af;">Password Recovery Verification</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 32px;">
                  <p style="margin: 0 0 16px; font-size: 15px; color: #e5e7eb; line-height: 1.6;">
                    Hello <strong style="color: #10b981;">@${username}</strong>,
                  </p>
                  <p style="margin: 0 0 24px; font-size: 14px; color: #9ca3af; line-height: 1.6;">
                    We received a request to reset the password for your DCC CSE account. Use the verification code below to complete the reset:
                  </p>
                  
                  <!-- OTP Code Box -->
                  <div style="background-color: #030712; border: 2px dashed #10b981; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #34d399; display: block;">
                      ${otp}
                    </span>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      Valid for 10 minutes only
                    </p>
                  </div>

                  <p style="margin: 0 0 16px; font-size: 13px; color: #9ca3af; line-height: 1.6;">
                    This code can only be used once. If your code expires, you will need to request a new one.
                  </p>

                  <div style="background-color: #1f2937; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-top: 24px;">
                    <p style="margin: 0; font-size: 12px; color: #d1d5db; line-height: 1.5;">
                      <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email. Your account remains completely secure and no changes have been made.
                    </p>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 32px 28px; text-align: center; border-top: 1px solid #1f2937; background-color: #090d16;">
                  <p style="margin: 0; font-size: 12px; color: #6b7280;">
                    Dhaka City College &bull; Department of Computer Science & Engineering
                  </p>
                  <p style="margin: 6px 0 0; font-size: 11px; color: #4b5563;">
                    This is an automated system message. Please do not reply directly to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `.trim();

  const text = `
DCC CSE - Student Academic Dashboard
Password Recovery Verification

Hello @${username},

We received a request to reset the password for your DCC CSE account.
Your verification code is: ${otp}

This code is valid for 10 minutes and can only be used once.

Security Notice: If you did not request a password reset, please ignore this email. Your account remains completely secure.

Dhaka City College - Department of Computer Science & Engineering
  `.trim();

  // 1. Prefer Gmail SMTP if credentials are provided (sends to any recipient domain without restrictions)
  if (smtpUser && smtpPassword) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPassword.replace(/\s+/g, ''),
        },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html,
        text,
      });

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'SMTP delivery failed';
      console.error('[Gmail SMTP Error]', err);
      return { success: false, error: message };
    }
  }

  // 2. Fall back to Resend API
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const { error } = await resend.emails.send({
        from: resendFromEmail,
        to,
        subject,
        html,
        text,
      });

      if (error) {
        console.error('[Resend Error]', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send email';
      console.error('[Resend Exception]', err);
      return { success: false, error: message };
    }
  }

  return { success: false, error: 'No email delivery provider configured.' };
}
