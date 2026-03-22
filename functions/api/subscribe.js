export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { name, email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    const firstName = name ? name.split(' ')[0] : 'there';

    // 1. Thank-you email to the user
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Naimab <hello@naimab.dev>',
        to: [email],
        subject: "You're on the Naimab waitlist 🌱",
        html: thankYouEmail(firstName),
      }),
    });

    // 2. Notification to owner
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Naimab Waitlist <hello@naimab.dev>',
        to: ['naimabteam@gmail.com'],
        subject: `New waitlist signup: ${email}`,
        html: `<p><b>Name:</b> ${escHtml(name || '—')}</p><p><b>Email:</b> ${escHtml(email)}</p>`,
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

function thankYouEmail(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>You're on the Naimab waitlist</title>
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
              Hey ${escHtml(firstName)}, you're in! 🎉
            </h1>
            <p style="margin:0 0 20px;font-size:16px;color:#555;line-height:1.6;">
              Thank you for joining the Naimab waitlist. You're among the first people who care about building a healthier relationship with work — and that means a lot to us.
            </p>
            <p style="margin:0 0 20px;font-size:16px;color:#555;line-height:1.6;">
              We'll reach out as soon as early access opens. Until then, take care of yourself.
            </p>

            <!-- Divider -->
            <div style="border-top:1px solid #f0ede8;margin:28px 0;"></div>

            <!-- What to expect -->
            <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.08em;">What to expect</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:8px 0;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2b180a;margin-right:10px;vertical-align:middle;"></span>
                  <span style="font-size:15px;color:#555;">Early access to Naimab before public launch</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2b180a;margin-right:10px;vertical-align:middle;"></span>
                  <span style="font-size:15px;color:#555;">No spam — only meaningful updates</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2b180a;margin-right:10px;vertical-align:middle;"></span>
                  <span style="font-size:15px;color:#555;">A chance to shape the product with your feedback</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 40px;text-align:center;">
            <a href="https://naimab.dev" style="display:inline-block;background:#2b180a;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:100px;">
              Visit naimab.dev
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fcf6ef;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
              You received this email because you signed up at naimab.dev.<br/>
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
