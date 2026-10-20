
import nodemailer from "nodemailer";

/* =====================================================
   SMTP CONFIGURATION
===================================================== */

const smtpPort = Number(process.env.SMTP_PORT || 465);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: smtpPort,
  secure:
    process.env.SMTP_SECURE === "true" ||
    smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* =====================================================
   VERIFY SMTP CONNECTION
===================================================== */

export async function verifyEmailService(): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error(
      "❌ SMTP_USER or SMTP_PASS is missing in .env"
    );
    return;
  }

  try {
    await transporter.verify();
    console.log("✅ Gmail SMTP connection verified");
  } catch (error) {
    console.error("❌ Gmail SMTP connection failed:", error);
  }
}

/* =====================================================
   SEND OTP EMAIL
===================================================== */

export async function sendOtpEmail(
  email: string,
  otp: string,
  expiresInMinutes = 5
): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error(
      "SMTP_USER and SMTP_PASS are not configured"
    );
  }

  if (!email || !otp) {
    throw new Error("Email and OTP are required");
  }

  const safeOtp = escapeHtml(otp);
  const safeExpiry = escapeHtml(String(expiresInMinutes));

  const text = [
    "Verify your email address",
    "",
    "Your LOGIFORGE AI verification code is:",
    "",
    otp,
    "",
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    "Never share this code with anyone.",
    "",
    "If you did not request this code, you can safely ignore this email.",
    "",
    "© 2026 LOGIFORGE AI",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Verify your email address</title>
</head>

<body style="
  margin:0;
  padding:32px 24px;
  background-color:#ffffff;
  color:#262626;
  font-family:Arial,Helvetica,sans-serif;
">

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="width:100%;background-color:#ffffff;"
  >
    <tr>
      <td align="left">

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            width:100%;
            max-width:680px;
            background-color:#ffffff;
          "
        >

          <!-- Heading -->
          <tr>
            <td style="padding:0 0 40px;">
              <h1 style="
                margin:0;
                color:#262626;
                font-size:40px;
                font-weight:700;
                line-height:1.2;
              ">
                Verify your email address
              </h1>
            </td>
          </tr>

          <!-- Description -->
          <tr>
            <td style="padding:0 0 36px;">
              <p style="
                margin:0;
                color:#303030;
                font-size:26px;
                line-height:1.5;
              ">
                Your LOGIFORGE AI verification code is:
              </p>
            </td>
          </tr>

          <!-- OTP -->
          <tr>
            <td style="padding:0 0 36px;">
              <p style="
                margin:0;
                color:#262626;
                font-size:40px;
                font-weight:700;
                line-height:1.2;
                letter-spacing:1px;
                overflow-wrap:anywhere;
              ">
                ${safeOtp}
              </p>
            </td>
          </tr>

          <!-- Expiry -->
          <tr>
            <td style="padding:0 0 30px;">
              <p style="
                margin:0;
                color:#303030;
                font-size:26px;
                line-height:1.5;
              ">
                This code expires in ${safeExpiry} minutes.
              </p>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td>
              <p style="
                margin:0;
                color:#303030;
                font-size:26px;
                line-height:1.5;
              ">
                Never share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- Ignore Notice -->
          <tr>
            <td style="padding-top:24px;">
              <p style="
                margin:0;
                color:#666666;
                font-size:15px;
                line-height:1.6;
              ">
                If you did not request this code, you can safely
                ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;">
              <p style="
                margin:0;
                color:#777777;
                font-size:13px;
                line-height:1.5;
              ">
                &copy; 2026 LOGIFORGE AI
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

  try {
    const info = await transporter.sendMail({
      from: `"logiforgeAI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your LOGIFORGE AI Verification Code",
      text,
      html,
    });

    console.log("✅ OTP email sent:", info.messageId);
    console.log("📧 Accepted recipients:", info.accepted);
    console.log("📧 Rejected recipients:", info.rejected);
    console.log("📨 SMTP response:", info.response);

    if (!info.accepted || info.accepted.length === 0) {
      throw new Error("SMTP did not accept the recipient");
    }
  } catch (error) {
    console.error("❌ OTP email sending failed:", error);
    throw error;
  }
}

/* =====================================================
   HTML ESCAPING
===================================================== */

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}
