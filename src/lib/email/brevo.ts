export async function sendInviteEmailBrevo(
  toEmail: string,
  inviteUrl: string,
  inviterName: string,
  projectName?: string | null,
  isEcosystem: boolean = false,
  message?: string | null
) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY is not set. Cannot send email.");
    return false;
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@foundersarena.org";
  
  let subject = isEcosystem 
    ? `${inviterName} has invited you to the Founders Arena Ecosystem`
    : `You've been invited by ${inviterName} to join Founders Arena`;

  if (projectName) {
    subject = `${inviterName} invited you to collaborate on ${projectName}`;
  }

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 0;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
      <div style="background-color: #0f172a; padding: 28px 36px;">
        <p style="margin: 0; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #94a3b8;">FOUNDERS ARENA</p>
        <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">You've been invited!</h1>
      </div>
      <div style="padding: 32px 36px;">
        <p style="font-size: 16px; color: #0f172a; line-height: 1.5; margin-top: 0;">
          <strong>${inviterName}</strong> has invited you to join them on Founders Arena${projectName ? ` to collaborate on <strong>${projectName}</strong>` : ''}.
        </p>
        ${message ? `
        <div style="margin: 24px 0; padding: 16px; background-color: #f8fafc; border-left: 4px solid #0f172a; border-radius: 4px;">
          <p style="margin: 0; font-size: 15px; color: #334155; font-style: italic;">"${message}"</p>
        </div>` : ''}
        <div style="margin-top: 32px; text-align: left;">
          <a href="${inviteUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">Accept Invitation</a>
        </div>
      </div>
      <div style="background-color: #f8fafc; padding: 20px 36px; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">FOUNDERS ARENA &middot; Exoasia Innovation Hub</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const payload = {
    sender: { name: "Founders Arena", email: senderEmail },
    to: [{ email: toEmail }],
    subject,
    htmlContent
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Brevo API error:", errText);
    throw new Error(`Brevo API error: ${errText}`);
  }

  return true;
}
