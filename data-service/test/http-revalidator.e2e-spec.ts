import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { HttpRevalidator } from '../src/external/revalidator/http-revalidator';

/*
 * The HTTP revalidator against a stand-in for the portfolio app's
 * `/api/internal/revalidate`.
 */

interface Seen {
  method: string | undefined;
  url: string | undefined;
  authorization: string | undefined;
  body: string;
}

let server: Server;
let origin: string;
let seen: Seen[];
let answer: number;

beforeAll(async () => {
  server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk: Buffer) => (body += chunk.toString()));
    request.on('end', () => {
      seen.push({
        method: request.method,
        url: request.url,
        authorization: request.headers.authorization,
        body,
      });
      response.writeHead(answer).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  seen = [];
  answer = 200;
});

it('POSTs the slug with the shared secret', async () => {
  const revalidator = new HttpRevalidator(
    `${origin}/api/internal/revalidate`,
    's3cret',
  );

  await revalidator.revalidate('alice');

  expect(seen).toEqual([
    {
      method: 'POST',
      url: '/api/internal/revalidate',
      authorization: 'Bearer s3cret',
      body: JSON.stringify({ slug: 'alice' }),
    },
  ]);
});

it('a refusal is not thrown', async () => {
  answer = 401;
  const revalidator = new HttpRevalidator(`${origin}/x`, 'wrong');

  await expect(revalidator.revalidate('alice')).resolves.toBeUndefined();
  expect(seen).toHaveLength(1);
});

it('an unreachable host is not thrown', async () => {
  const revalidator = new HttpRevalidator('http://127.0.0.1:1/x', 's3cret');

  await expect(revalidator.revalidate('alice')).resolves.toBeUndefined();
});
