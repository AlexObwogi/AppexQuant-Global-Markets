import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server.js';

let appPromise: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!appPromise) {
    appPromise = createApp();
  }
  const app = await appPromise;
  return app(req, res);
}
