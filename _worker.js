import {
  handleContactContext,
  handleSubscribeContext,
  withSecurityHeaders,
} from './server/api.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/subscribe') {
      return handleSubscribeContext({ request, env, waitUntil: ctx?.waitUntil?.bind(ctx) });
    }

    if (url.pathname === '/api/contact') {
      return handleContactContext({ request, env, waitUntil: ctx?.waitUntil?.bind(ctx) });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse, request, env);
  },
};
