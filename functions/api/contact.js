export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { name, email, message } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (!message || message.trim().length < 5) {
      return Response.json({ error: 'Message too short' }, { status: 400 });
    }

    const firstName = name ? name.split(' ')[0] : 'there';

    // 1. Forward message to owner
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Naimab Contact <hello@naimab.dev>',
        to: ['naimabteam@gmail.com'],
        reply_to: email,
        subject: `Message from ${escHtml(name || email)}`,
        html: `
          <p><b>Name:</b> ${escHtml(name || '—')}</p>
          <p><b>Email:</b> ${escHtml(email)}</p>
          <p><b>Message:</b></p>
          <p style="white-space:pre-wrap;background:#f5f5f5;padding:16px;border-radius:8px;">${escHtml(message)}</p>
        `,
      }),
    });

    // 2. Confirmation to the user
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Naimab <hello@naimab.dev>',
        to: [email],
        subject: 'We got your message 👋',
        html: contactConfirmEmail(firstName, message),
      }),
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function contactConfirmEmail(firstName, message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>We got your message</title>
</head>
<body style="margin:0;padding:0;background:#F7F4F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4F0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2b180a,#3e2407);padding:36px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 20px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">naimab</span>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#1a1a1a;line-height:1.3;">
              Hey ${escHtml(firstName)}, we got your message 👋
            </h1>
            <p style="margin:0 0 20px;font-size:16px;color:#555;line-height:1.6;">
              Thanks for reaching out! We'll get back to you as soon as we can, usually within 1–2 business days.
            </p>

            <!-- Message preview -->
            <div style="background:#fcf6ef;border-left:3px solid #2b180a;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#2b180a;text-transform:uppercase;letter-spacing:0.08em;">Your message</p>
              <p style="margin:0;font-size:14px;color:#666;line-height:1.6;white-space:pre-wrap;">${escHtml(message)}</p>
            </div>

            <p style="margin:0;font-size:15px;color:#555;line-height:1.6;">
              Talk soon,<br/>
              <b style="color:#1a1a1a;">The Naimab Team</b>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fcf6ef;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
              You received this email because you contacted us at naimab.dev.<br/>
              © 2026 Naimab. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
