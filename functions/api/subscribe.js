export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { name, email } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!env?.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const firstName = name ? name.split(' ')[0] : 'there';

    // 1. Thank-you email to the user
    await sendResendEmail(env, {
      from: 'Naimab <hello@naimab.dev>',
      to: [email],
      subject: "You're on the Naimab waitlist",
      html: thankYouEmail(firstName),
    }, 'subscribe:confirmation');

    // 2. Notification to owner should not block the success state for the subscriber.
    const notificationPromise = sendResendEmail(env, {
      from: 'Naimab Waitlist <hello@naimab.dev>',
      to: ['naimabteam@gmail.com'],
      subject: `New waitlist signup: ${email}`,
      html: `<p><b>Name:</b> ${escHtml(name || '-')}</p><p><b>Email:</b> ${escHtml(email)}</p>`,
    }, 'subscribe:notification').catch((error) => {
      console.error('subscribe notification failed', formatError(error));
    });

    if (typeof context.waitUntil === 'function') {
      context.waitUntil(notificationPromise);
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('subscribe handler failed', formatError(error));
    return Response.json({ error: 'Waitlist signup is temporarily unavailable. Please try again later.' }, { status: 500 });
  }
}

async function sendResendEmail(env, payload, logContext) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  let parsedBody = null;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    console.error('resend request failed', {
      context: logContext,
      status: response.status,
      body: parsedBody ?? rawBody,
    });
    throw new Error(`Resend request failed with status ${response.status}`);
  }
}

function formatError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }

  return { error: String(error) };
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
<body style="margin:0;padding:0;background:#f7f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:48px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;">

        <!-- Logo -->
        <tr>
          <td style="padding:0 0 32px;text-align:center;">
            <span style="font-size:18px;font-weight:700;color:#2b180a;letter-spacing:-0.5px;">naimab</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#ffffff;border-radius:20px;padding:48px 48px 40px;">

            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#dab697;text-transform:uppercase;letter-spacing:0.1em;">Waitlist confirmed</p>

            <h1 style="margin:0 0 24px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.25;letter-spacing:-0.03em;">
              Thank you, ${escHtml(firstName)}.
            </h1>

            <p style="margin:0 0 16px;font-size:16px;color:#5c5047;line-height:1.7;">
              We genuinely appreciate you signing up. Early supporters like you are the reason we're building Naimab — and knowing that people care enough to wait means a great deal to us.
            </p>
            <p style="margin:0 0 32px;font-size:16px;color:#5c5047;line-height:1.7;">
              When early access opens, you'll be among the first to hear. We won't send anything else in the meantime.
            </p>

            <!-- Divider -->
            <div style="border-top:1px solid #ede8e2;margin:0 0 32px;"></div>

            <!-- What to expect -->
            <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:#2b180a;text-transform:uppercase;letter-spacing:0.1em;">What comes next</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:7px 0;font-size:15px;color:#5c5047;line-height:1.5;">
                  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#dab697;margin-right:12px;vertical-align:middle;"></span>Early access before the public launch
                </td>
              </tr>
              <tr>
                <td style="padding:7px 0;font-size:15px;color:#5c5047;line-height:1.5;">
                  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#dab697;margin-right:12px;vertical-align:middle;"></span>One email when it's ready — nothing more
                </td>
              </tr>
              <tr>
                <td style="padding:7px 0;font-size:15px;color:#5c5047;line-height:1.5;">
                  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#dab697;margin-right:12px;vertical-align:middle;"></span>An opportunity to shape the product with direct feedback
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:36px;">
              <tr>
                <td align="center">
                  <a href="https://naimab.dev" style="display:inline-block;background:#2b180a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:100px;letter-spacing:0.01em;">
                    Visit naimab.dev
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:28px 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a89e94;line-height:1.6;">
              You received this because you joined the waitlist at naimab.dev.<br/>
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
