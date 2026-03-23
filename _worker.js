const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/subscribe') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
      }

      return handleSubscribe(request, env);
    }

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
      }

      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleSubscribe(request, env) {
  try {
    const body = await parseJsonBody(request);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!EMAIL_REGEX.test(email)) {
      return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
    }

    ensureResendConfig(env);

    const firstName = name ? name.split(/\s+/)[0] : 'there';

    await sendResendEmail(env, {
      from: 'Naimab <hello@naimab.dev>',
      to: [email],
      subject: "You're on the Naimab waitlist",
      html: thankYouEmail(firstName),
    }, 'subscribe:confirmation');

    await sendResendEmail(env, {
      from: 'Naimab Waitlist <hello@naimab.dev>',
      to: ['naimabteam@gmail.com'],
      subject: `New waitlist signup: ${email}`,
      html: `<p><b>Name:</b> ${escapeHtml(name || '-')}</p><p><b>Email:</b> ${escapeHtml(email)}</p>`,
    }, 'subscribe:notification');

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error('subscribe handler failed', formatError(error));
    return jsonResponse({ error: 'Waitlist signup is temporarily unavailable. Please try again later.' }, 500);
  }
}

async function handleContact(request, env) {
  try {
    const body = await parseJsonBody(request);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!EMAIL_REGEX.test(email)) {
      return jsonResponse({ error: 'Please enter a valid email address.' }, 400);
    }

    if (message.length < 5) {
      return jsonResponse({ error: 'Please enter a longer message.' }, 400);
    }

    ensureResendConfig(env);

    const firstName = name ? name.split(/\s+/)[0] : 'there';

    await sendResendEmail(env, {
      from: 'Naimab Contact <hello@naimab.dev>',
      to: ['naimabteam@gmail.com'],
      reply_to: email,
      subject: `Message from ${escapeHtml(name || email)}`,
      html: `
        <p><b>Name:</b> ${escapeHtml(name || '-')}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Message:</b></p>
        <p style="white-space:pre-wrap;background:#f5f5f5;padding:16px;border-radius:8px;">${escapeHtml(message)}</p>
      `,
    }, 'contact:notification');

    await sendResendEmail(env, {
      from: 'Naimab <hello@naimab.dev>',
      to: [email],
      subject: 'We got your message',
      html: contactConfirmEmail(firstName, message),
    }, 'contact:confirmation');

    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error('contact handler failed', formatError(error));
    return jsonResponse({ error: 'Message delivery is temporarily unavailable. Please try again later.' }, 500);
  }
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new Error('Request body must be valid JSON');
  }
}

function ensureResendConfig(env) {
  if (!env?.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
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
  const parsedBody = tryParseJson(rawBody);

  if (!response.ok) {
    console.error('resend request failed', {
      context: logContext,
      status: response.status,
      body: parsedBody ?? rawBody,
    });
    throw new Error(`Resend request failed with status ${response.status}`);
  }

  return parsedBody ?? rawBody;
}

function tryParseJson(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
        <tr>
          <td style="padding:0 0 32px;text-align:center;">
            <span style="font-size:18px;font-weight:700;color:#2b180a;letter-spacing:-0.5px;">naimab</span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:20px;padding:48px 48px 40px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#dab697;text-transform:uppercase;letter-spacing:0.1em;">Waitlist confirmed</p>
            <h1 style="margin:0 0 24px;font-size:26px;font-weight:700;color:#1a1a1a;line-height:1.25;letter-spacing:-0.03em;">
              Thank you, ${escapeHtml(firstName)}.
            </h1>
            <p style="margin:0 0 16px;font-size:16px;color:#5c5047;line-height:1.7;">
              We genuinely appreciate you signing up. Early supporters like you are the reason we're building Naimab, and knowing that people care enough to wait means a great deal to us.
            </p>
            <p style="margin:0 0 32px;font-size:16px;color:#5c5047;line-height:1.7;">
              When early access opens, you'll be among the first to hear. We won't send anything else in the meantime.
            </p>
            <div style="border-top:1px solid #ede8e2;margin:0 0 32px;"></div>
            <p style="margin:0 0 16px;font-size:12px;font-weight:700;color:#2b180a;text-transform:uppercase;letter-spacing:0.1em;">What comes next</p>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="padding:7px 0;font-size:15px;color:#5c5047;line-height:1.5;">
                  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#dab697;margin-right:12px;vertical-align:middle;"></span>Early access before the public launch
                </td>
              </tr>
              <tr>
                <td style="padding:7px 0;font-size:15px;color:#5c5047;line-height:1.5;">
                  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#dab697;margin-right:12px;vertical-align:middle;"></span>One email when it's ready, nothing more
                </td>
              </tr>
              <tr>
                <td style="padding:7px 0;font-size:15px;color:#5c5047;line-height:1.5;">
                  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#dab697;margin-right:12px;vertical-align:middle;"></span>An opportunity to shape the product with direct feedback
                </td>
              </tr>
            </table>
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
        <tr>
          <td style="background:linear-gradient(135deg,#2b180a,#3e2407);padding:36px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:8px 20px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">naimab</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#1a1a1a;line-height:1.3;">
              Hey ${escapeHtml(firstName)}, we got your message.
            </h1>
            <p style="margin:0 0 20px;font-size:16px;color:#555;line-height:1.6;">
              Thanks for reaching out! We'll get back to you as soon as we can, usually within 1 to 2 business days.
            </p>
            <div style="background:#fcf6ef;border-left:3px solid #2b180a;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#2b180a;text-transform:uppercase;letter-spacing:0.08em;">Your message</p>
              <p style="margin:0;font-size:14px;color:#666;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</p>
            </div>
            <p style="margin:0;font-size:15px;color:#555;line-height:1.6;">
              Talk soon,<br/>
              <b style="color:#1a1a1a;">The Naimab Team</b>
            </p>
          </td>
        </tr>
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
