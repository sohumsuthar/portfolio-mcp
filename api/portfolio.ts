import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../dist/api-server.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Route all requests through the Express app
  return new Promise((resolve) => {
    app(req, res, () => {
      res.status(404).json({ error: 'Not found' });
      resolve(null);
    });
  });
}
