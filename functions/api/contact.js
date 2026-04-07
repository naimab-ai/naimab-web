import { handleContactContext } from '../../server/api.js';

export async function onRequestPost(context) {
  return handleContactContext(context);
}
