import { Resend } from "resend";

const FROM = "onboarding@resend.dev";

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendNewSignupNotification(user: {
  email: string;
  createdAt: string;
  location?: string;
  browser?: string;
}) {
  const resend = getResend();
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!resend || !adminEmail) {
    console.warn("Skipping new signup notification: RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL not set.");
    return;
  }

  const signedUpAt = new Date(user.createdAt).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "full",
    timeStyle: "short",
  });

  try {
    await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject: `New signup: ${user.email}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:#0f172a;padding:28px 36px">
            <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8">FOUNDERS ARENA</p>
            <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;color:#ffffff">New Member Signup</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 36px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
                  <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8">Email</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#0f172a;font-weight:500">${user.email}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
                  <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8">Signed Up</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#0f172a">${signedUpAt} (PHT)</p>
                </td>
              </tr>
              ${user.location ? `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #f1f5f9">
                  <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8">Location</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#0f172a">${user.location}</p>
                </td>
              </tr>` : ""}
              ${user.browser ? `
              <tr>
                <td style="padding:12px 0">
                  <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8">Browser</p>
                  <p style="margin:4px 0 0;font-size:15px;color:#0f172a">${user.browser}</p>
                </td>
              </tr>` : ""}
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #f1f5f9">
            <p style="margin:0;font-size:12px;color:#94a3b8">FOUNDERS ARENA &middot; Exoasia Innovation Hub &middot; 21F 8 Rockwell, Makati City</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  } catch (error) {
    console.error("Failed to send signup notification:", error);
  }
}
