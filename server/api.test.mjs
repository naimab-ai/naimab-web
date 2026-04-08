import test from 'node:test';
import assert from 'node:assert/strict';

import { handleSubscribeRequest } from './api.js';

function createSubscribeRequest(body = {}) {
  return new Request('https://example.com/api/subscribe', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://example.com',
    },
    body: JSON.stringify({
      email: 'person@example.com',
      name: 'Pat Example',
      company: '',
      turnstileToken: '',
      ...body,
    }),
  });
}

test('subscribe returns 503 when email delivery is not configured', async () => {
  const response = await handleSubscribeRequest(createSubscribeRequest(), {}, {});
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.deepEqual(payload, {
    error: 'Email delivery is temporarily unavailable. Please try again later.',
    code: 'EMAIL_DELIVERY_UNAVAILABLE',
  });
});

test('subscribe returns 503 when resend rejects the request', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (typeof input === 'string' && input === 'https://api.resend.com/emails') {
      return new Response(JSON.stringify({ message: 'upstream unavailable' }), {
        status: 503,
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    throw new Error(`Unexpected fetch: ${String(input)}`);
  };

  try {
    const response = await handleSubscribeRequest(
      createSubscribeRequest(),
      { RESEND_API_KEY: 'test-key' },
      {},
    );
    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.deepEqual(payload, {
      error: 'Email delivery is temporarily unavailable. Please try again later.',
      code: 'EMAIL_DELIVERY_UNAVAILABLE',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('subscribe still succeeds when waitUntil scheduling throws', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ id: 'email_123' }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });
  };

  try {
    const response = await handleSubscribeRequest(
      createSubscribeRequest(),
      { RESEND_API_KEY: 'test-key' },
      {
        waitUntil() {
          throw new Error('waitUntil boom');
        },
      },
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload, { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
