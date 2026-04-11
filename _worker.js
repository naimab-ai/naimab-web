import {
  handleContactContext,
  handleSubscribeContext,
  withSecurityHeaders,
} from './server/api.js';

const BETA_DOWNLOAD_PATH = '/beta/download';
const BETA_INSTALLER_ASSET_PATH = '/downloads/Naimab-Beta-Setup.exe';
const BETA_INSTALLER_FILENAME = 'Naimab-Beta-Setup.exe';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === BETA_DOWNLOAD_PATH) {
      return handleBetaDownloadRequest(request, env);
    }

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

async function handleBetaDownloadRequest(request, env) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return withSecurityHeaders(
      new Response('Method not allowed', {
        status: 405,
        headers: {
          Allow: 'GET, HEAD',
          'Cache-Control': 'no-store',
        },
      }),
      request,
      env,
    );
  }

  const assetUrl = new URL(request.url);
  assetUrl.pathname = BETA_INSTALLER_ASSET_PATH;
  assetUrl.search = '';

  const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  if (assetResponse.status === 404) {
    return handleMissingBetaDownload(request, env);
  }

  const headers = new Headers(assetResponse.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Disposition', `attachment; filename="${BETA_INSTALLER_FILENAME}"`);

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/octet-stream');
  }

  return withSecurityHeaders(
    new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    }),
    request,
    env,
  );
}

async function handleMissingBetaDownload(request, env) {
  if (request.method === 'HEAD') {
    return withSecurityHeaders(
      new Response(null, {
        status: 404,
        headers: {
          'Cache-Control': 'no-store',
          'X-Download-Status': 'missing',
        },
      }),
      request,
      env,
    );
  }

  const redirectUrl = new URL(request.url);
  redirectUrl.pathname = '/beta';
  redirectUrl.search = 'download=missing';

  return withSecurityHeaders(Response.redirect(redirectUrl.toString(), 302), request, env);
}
