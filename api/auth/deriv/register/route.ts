import { GET as loginGet, POST as loginPost } from '../login/route.ts';

export async function GET(request: Request): Promise<Response> {
  return loginGet(request);
}

export async function POST(request: Request): Promise<Response> {
  return loginPost(request);
}
