// Dedicated Vercel Serverless Function for LINE Webhook
// @ts-ignore
import serverModule from '../../dist/server.cjs';

const app = serverModule.app || serverModule.default?.app || serverModule.default;

export default function handler(req: any, res: any) {
  req.url = '/api/line/webhook';
  return app(req, res);
}
