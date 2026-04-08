const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};
const MAX_JSON_BYTES = 8 * 1024;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 320;
const MAX_MESSAGE_LENGTH = 4_000;
const RATE_LIMIT_RULES = {
  subscribe: { max: 5, windowMs: 10 * 60 * 1000 },
  contact: { max: 3, windowMs: 10 * 60 * 1000 },
};
const RATE_LIMIT_STORE =
  globalThis.__naimabRateLimitStore || (globalThis.__naimabRateLimitStore = new Map());

export async function handleSubscribeContext(context) {
  return handleSubscribeRequest(context.request, context.env, context);
}

export async function handleContactContext(context) {
  return handleContactRequest(context.request, context.env, context);
}

export async function handleSubscribeRequest(request, env, ctx) {
  return handleProtectedRoute({
    request,
    env,
    ctx,
    route: 'subscribe',
    parsePayload: parseSubscribePayload,
    execute: async ({ env: runtimeEnv, payload, ctx: runtimeCtx }) => {
      const { name, email } = payload;
      const firstName = getFirstName(name);

      await sendResendEmail(
        runtimeEnv,
        {
          from: 'Naimab <hello@naimab.com>',
          to: [email],
          subject: "You're on the Naimab waitlist",
          html: thankYouEmail(firstName),
        },
        'subscribe:confirmation',
      );

      const notificationPromise = sendResendEmail(
        runtimeEnv,
        {
          from: 'Naimab Waitlist <hello@naimab.com>',
          to: ['naimabteam@gmail.com'],
          subject: 'New waitlist signup',
          html: `<p><b>Name:</b> ${escapeHtml(name || '-')}</p><p><b>Email:</b> ${escapeHtml(email)}</p>`,
        },
        'subscribe:notification',
      ).catch((error) => {
        console.error('subscribe notification failed', formatError(error));
      });

      scheduleBackgroundTask(runtimeCtx, notificationPromise, 'subscribe notification');

      return jsonResponse({ ok: true }, 200);
    },
  });
}

export async function handleContactRequest(request, env, ctx) {
  return handleProtectedRoute({
    request,
    env,
    ctx,
    route: 'contact',
    parsePayload: parseContactPayload,
    execute: async ({ env: runtimeEnv, payload }) => {
      const { name, email, message } = payload;
      const firstName = getFirstName(name);

      await sendResendEmail(
        runtimeEnv,
        {
          from: 'Naimab Contact <hello@naimab.com>',
          to: ['naimabteam@gmail.com'],
          reply_to: email,
          subject: 'New contact message',
          html: `
            <p><b>Name:</b> ${escapeHtml(name || '-')}</p>
            <p><b>Email:</b> ${escapeHtml(email)}</p>
            <p><b>Message:</b></p>
            <p style="white-space:pre-wrap;background:#f5f5f5;padding:16px;border-radius:8px;">${escapeHtml(message)}</p>
          `,
        },
        'contact:notification',
      );

      await sendResendEmail(
        runtimeEnv,
        {
          from: 'Naimab <hello@naimab.com>',
          to: [email],
          subject: 'We got your message',
          html: contactConfirmEmail(firstName, message),
        },
        'contact:confirmation',
      );

      return jsonResponse({ ok: true }, 200);
    },
  });
}

export async function withSecurityHeaders(response, request, env) {
  const contentType = response.headers.get('content-type') || '';
  const isHtml = contentType.includes('text/html');

  let nextResponse = response;
  if (isHtml && env?.TURNSTILE_SITE_KEY) {
    nextResponse = new HTMLRewriter()
      .on('head', new TurnstileMetaInjector(env.TURNSTILE_SITE_KEY))
      .transform(response);
  }

  const headers = new Headers(nextResponse.headers);
  applySecurityHeaders(headers, isHtml);

  return new Response(nextResponse.body, {
    status: nextResponse.status,
    statusText: nextResponse.statusText,
    headers,
  });
}

async function handleProtectedRoute({ request, env, ctx, route, parsePayload, execute }) {
  try {
    enforceMethod(request, 'POST');
    enforceContentType(request);
    enforceSameOrigin(request, env);
    enforceRateLimit(request, route);

    const rawBody = await readJsonBody(request);
    const payload = parsePayload(rawBody);

    if (payload.botField) {
      return jsonResponse({ ok: true }, 200);
    }

    await verifyTurnstileToken(request, env, payload.turnstileToken);

    return await execute({ request, env, ctx, payload });
  } catch (error) {
    return errorResponse(error);
  }
}

function scheduleBackgroundTask(ctx, taskPromise, label) {
  if (!ctx || typeof ctx.waitUntil !== 'function') {
    return;
  }

  try {
    ctx.waitUntil(taskPromise);
  } catch (error) {
    console.error(`${label} could not be scheduled`, formatError(error));
  }
}

function enforceMethod(request, expectedMethod) {
  if (request.method !== expectedMethod) {
    throw new HttpError(405, 'Method not allowed', { Allow: expectedMethod });
  }
}

function enforceContentType(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Requests must use application/json.');
  }
}

function enforceSameOrigin(request, env) {
  const requestOrigin = new URL(request.url).origin;
  const allowedOrigins = new Set(
    [requestOrigin, ...(env?.ALLOWED_ORIGINS || '').split(',')]
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins.has(origin)) {
    throw new HttpError(403, 'Cross-site requests are not allowed.');
  }

  const secFetchSite = (request.headers.get('sec-fetch-site') || '').toLowerCase();
  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    throw new HttpError(403, 'Cross-site requests are not allowed.');
  }
}

function enforceRateLimit(request, route) {
  const rule = RATE_LIMIT_RULES[route];
  if (!rule) return;

  pruneExpiredRateLimits();

  const ip = getClientIp(request);
  const key = `${route}:${ip}`;
  const now = Date.now();
  const existing = RATE_LIMIT_STORE.get(key);

  if (!existing || existing.resetAt <= now) {
    RATE_LIMIT_STORE.set(key, { count: 1, resetAt: now + rule.windowMs });
    return;
  }

  if (existing.count >= rule.max) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    throw new HttpError(429, 'Too many requests. Please try again later.', {
      'Retry-After': String(retryAfter),
    });
  }

  existing.count += 1;
}

function pruneExpiredRateLimits() {
  if (RATE_LIMIT_STORE.size < 256) return;

  const now = Date.now();
  for (const [key, entry] of RATE_LIMIT_STORE.entries()) {
    if (!entry || entry.resetAt <= now) {
      RATE_LIMIT_STORE.delete(key);
    }
  }
}

function getClientIp(request) {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return 'unknown';
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    throw new HttpError(413, 'Request body is too large.');
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_JSON_BYTES) {
    throw new HttpError(413, 'Request body is too large.');
  }

  try {
    return JSON.parse(rawBody || '{}');
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
}

function parseSubscribePayload(body) {
  return {
    name: normalizeText(body?.name, {
      maxLength: MAX_NAME_LENGTH,
      collapseWhitespace: true,
    }),
    email: normalizeEmail(body?.email),
    botField: normalizeText(body?.company, {
      maxLength: MAX_NAME_LENGTH,
      collapseWhitespace: true,
    }),
    turnstileToken: normalizeText(body?.turnstileToken || body?.['cf-turnstile-response'], {
      maxLength: 2048,
    }),
  };
}

function parseContactPayload(body) {
  const message = normalizeText(body?.message, {
    maxLength: MAX_MESSAGE_LENGTH,
    allowNewlines: true,
  });
  if (!message) {
    throw new HttpError(400, 'Please enter a longer message.');
  }

  return {
    name: normalizeText(body?.name, {
      maxLength: MAX_NAME_LENGTH,
      collapseWhitespace: true,
    }),
    email: normalizeEmail(body?.email),
    message,
    botField: normalizeText(body?.company, {
      maxLength: MAX_NAME_LENGTH,
      collapseWhitespace: true,
    }),
    turnstileToken: normalizeText(body?.turnstileToken || body?.['cf-turnstile-response'], {
      maxLength: 2048,
    }),
  };
}

function normalizeEmail(value) {
  const email = normalizeText(value, {
    maxLength: MAX_EMAIL_LENGTH,
    collapseWhitespace: true,
  }).toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    throw new HttpError(400, 'Please enter a valid email address.');
  }

  return email;
}

function normalizeText(value, options = {}) {
  if (typeof value !== 'string') return '';

  const {
    maxLength = 0,
    allowNewlines = false,
    collapseWhitespace = false,
  } = options;

  let normalized = value.replace(/\u0000/g, '');
  normalized = allowNewlines ? normalized.replace(/\r\n/g, '\n') : normalized.replace(/[\r\n\t]/g, ' ');
  normalized = normalized.trim();

  if (collapseWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ');
  }

  if (maxLength > 0 && normalized.length > maxLength) {
    throw new HttpError(400, 'Submitted data is too long.');
  }

  return normalized;
}

async function verifyTurnstileToken(request, env, token) {
  if (!env?.TURNSTILE_SECRET_KEY) return;
  if (!token) {
    throw new HttpError(400, 'Verification failed. Please try again.');
  }

  let response;
  try {
    response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: getClientIp(request),
      }),
    });
  } catch (error) {
    console.error('turnstile verification request failed', {
      ...formatError(error),
      clientIp: getClientIp(request),
    });
    throw new HttpError(
      503,
      'Verification is temporarily unavailable. Please try again later.',
      {},
      'VERIFICATION_UNAVAILABLE',
    );
  }

  let result = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    console.error('turnstile verification responded with an error', {
      status: response.status,
      result,
      clientIp: getClientIp(request),
    });
    throw new HttpError(
      503,
      'Verification is temporarily unavailable. Please try again later.',
      {},
      'VERIFICATION_UNAVAILABLE',
    );
  }

  if (!result?.success) {
    throw new HttpError(400, 'Verification failed. Please try again.');
  }
}

function ensureResendConfig(env) {
  if (!env?.RESEND_API_KEY) {
    console.error('resend configuration is missing');
    throw new HttpError(
      503,
      'Email delivery is temporarily unavailable. Please try again later.',
      {},
      'EMAIL_DELIVERY_UNAVAILABLE',
    );
  }
}

async function sendResendEmail(env, payload, logContext) {
  ensureResendConfig(env);

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('resend request failed before receiving a response', {
      context: logContext,
      ...formatError(error),
    });
    throw new HttpError(
      503,
      'Email delivery is temporarily unavailable. Please try again later.',
      {},
      'EMAIL_DELIVERY_UNAVAILABLE',
    );
  }

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    console.error('resend request failed', {
      context: logContext,
      status: response.status,
      body: responseText.slice(0, 500),
    });
    throw new HttpError(
      503,
      'Email delivery is temporarily unavailable. Please try again later.',
      {},
      'EMAIL_DELIVERY_UNAVAILABLE',
    );
  }
}

function getFirstName(name) {
  return (name ? name.split(/\s+/)[0] : 'there').slice(0, 40) || 'there';
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  const headers = new Headers(JSON_HEADERS);
  for (const [name, value] of Object.entries(extraHeaders)) {
    headers.set(name, value);
  }
  applySecurityHeaders(headers, false);

  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

function errorResponse(error) {
  if (error instanceof HttpError) {
    const body = { error: error.message };
    if (error.code) {
      body.code = error.code;
    }
    return jsonResponse(body, error.status, error.headers);
  }

  console.error('api request failed', formatError(error));
  return jsonResponse(
    { error: 'Request is temporarily unavailable. Please try again later.' },
    500,
  );
}

function formatError(error) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      cause: error.cause ? String(error.cause) : undefined,
    };
  }

  return { error: String(error) };
}

function applySecurityHeaders(headers, isHtml) {
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set(
    'Permissions-Policy',
    'accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()',
  );
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  if (isHtml) {
    headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "img-src 'self' data: https:",
        "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://challenges.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://challenges.cloudflare.com",
        "frame-src https://challenges.cloudflare.com",
        'upgrade-insecure-requests',
      ].join('; '),
    );
  }
}

class HttpError extends Error {
  constructor(status, message, headers = {}, code = '') {
    super(message);
    this.status = status;
    this.headers = headers;
    this.code = code;
  }
}

class TurnstileMetaInjector {
  constructor(siteKey) {
    this.siteKey = siteKey;
  }

  element(element) {
    element.append(
      `<meta name="turnstile-site-key" content="${escapeHtml(this.siteKey)}">`,
      { html: true },
    );
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
                  <a href="https://naimab.com" style="display:inline-block;background:#2b180a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:100px;letter-spacing:0.01em;">
                    Visit naimab.com
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a89e94;line-height:1.6;">
              You received this because you joined the waitlist at naimab.com.<br/>
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
              Thanks for reaching out. We'll get back to you as soon as we can, usually within 1 to 2 business days.
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
              You received this email because you contacted us at naimab.com.<br/>
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
