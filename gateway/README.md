# gateway

Fronts `api` on two hostnames: its own, which carries the admin route, and the public-read host.
It serves no page. The admin SPA is served by the admin host, which forwards `/api/*` here
(SRS FR-EDGE-1, 2, 9).

## Environment

Every value is validated at boot; `gateway` refuses to start on a bad one. `.env.example` holds a
working development set.

| Variable | Required | Meaning |
|---|---|---|
| `GATEWAY_ADMIN_HOST` | yes | `gateway`'s own hostname, which carries the admin route. Matched exactly. Bare hostname: no scheme, no port. Not the admin host's name, and never in a browser-facing URL. |
| `PUBLIC_READ_HOST` | yes | Public-read hostname, matched exactly. Must differ from `GATEWAY_ADMIN_HOST`. |
| `API_UPSTREAM` | yes | Where `api` is reached, as an origin with no path — `http://127.0.0.1:3001`. It need not be private. |
| `GATEWAY_API_KEY` | yes | Secret. Sent to `api` as `X-Api-Key` on every request: base64url, at least 32 bytes decoded. Must be one of `api`'s `GATEWAY_API_KEYS`. |
| `PORT` | yes | Port to listen on, all interfaces. |
| `TLS_CERT_PATH` | with `TLS_KEY_PATH` | PEM certificate covering both hostnames. Set both to terminate TLS in-process. |
| `TLS_KEY_PATH` | with `TLS_CERT_PATH` | PEM private key for that certificate. |
| `TRUSTED_PROXY_CIDRS` | no | Comma-separated addresses or CIDRs whose `X-Forwarded-For` and `X-Forwarded-Proto` are believed: the admin host's egress addresses, and a load balancer's if there is one. The client address is the rightmost entry not in this list; from any other peer it is the peer address (FR-EDGE-10). Empty means nobody's is believed. |
| `RATE_LIMIT_OAUTH_MAX` | yes | Requests per window, per IP, on `/api/auth/google/start` and `/callback` together. |
| `RATE_LIMIT_OAUTH_WINDOW_MS` | yes | That window, in milliseconds. |
| `RATE_LIMIT_AUTH_MAX` | yes | Requests per window, per IP, on every other `/api/auth/*` path. |
| `RATE_LIMIT_AUTH_WINDOW_MS` | yes | That window, in milliseconds. |
| `RATE_LIMIT_PUBLIC_MAX` | yes | Requests per window, per IP, on the public-read host. |
| `RATE_LIMIT_PUBLIC_WINDOW_MS` | yes | That window, in milliseconds. |

`gateway` reads the process environment only; nothing in it opens `.env`. `npm run dev` passes
`--env-file=.env` to Node, and `npm start` does not. Under pm2, start it from the ecosystem file,
which passes the same flag:

```
npm run build
pm2 start ecosystem.config.cjs
```

## Local development topology

Development runs this same service with these same rules, on `localhost` over plain HTTP: no
certificate and no hosts entry. Both `TLS_*` paths stay empty.

```
Browser ──► http://localhost:5174 ──► admin host ─┬─ /*      ──► the admin SPA
                                                   └─ /api/*  ──► http://gateway.localhost:8080

admin host ──► http://gateway.localhost:8080 ──► gateway :8080 ─┬─ /api/auth/*  ──► api 127.0.0.1:3001 /auth/*
                                                                 ├─ /api/admin/* ──► api /auth/resolve ──► api /admin/*
                                                                 └─ anything else ──► 404
portfolio (next dev) ──► http://api.localhost:8080 ──► gateway :8080 ── GET /public/* ──► api /public/*
```

In development `api` listens on loopback and is reached through `gateway`. Nothing depends on that:
`gateway` sends `X-Api-Key` on every request to `api`, and `api` answers `401` on `/auth/*` and
`/admin/*` without it (FR-EDGE-5).

The session cookies are `Secure` (FR-AUTH-3). A browser accepts them over plain HTTP on `localhost`
and nowhere else, so the panel is opened at `localhost`, not at a hosts-file name.

### Run order

1. **Database** — MongoDB, as `data-service/.env` points to it.
2. **`api`** — in `data-service/`: `npm run start:dev`. It binds `127.0.0.1:3001`.
3. **admin host** — in development, the admin dev server in `admin-panel/`, answering on
   `localhost:5174` and forwarding `/api/*` to `http://gateway.localhost:8080` by the rules of
   FR-EDGE-9. `gateway` no longer serves the build.
4. **`gateway`** — in `gateway/`: copy `.env.example` to `.env`, set `GATEWAY_API_KEY` to the key in
   `GATEWAY_API_KEYS` of `data-service/.env`, then `npm install` and `npm run dev`.
5. **`portfolio`**, when needed — in `portfolio/`, with `PORTFOLIO_API_URL=http://api.localhost:8080`:
   `npm run dev`.

Open `http://localhost:5174`.
