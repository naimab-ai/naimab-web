import { handleSubscribeContext } from '../../server/api.js';

export async function onRequestPost(context) {
  return handleSubscribeContext(context);
}
