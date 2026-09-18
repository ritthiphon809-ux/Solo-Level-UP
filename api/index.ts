// Vercel Serverless Function entry point for Solo Level Up API
// @ts-ignore
import serverModule from '../dist/server.cjs';

const app = serverModule.app || serverModule.default?.app || serverModule.default;

export default function handler(req: any, res: any) {
  if (req.headers['x-matched-path']) {
    req.url = req.headers['x-matched-path'];
  }
  return app(req, res);
}
