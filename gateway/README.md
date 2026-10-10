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

## Local development topology (NFR-OPS-6)

Development runs this same service with these same rules, on real hostnames over HTTPS. `localhost`
is not enough: the cookie scoping the design depends on cannot be exercised there.

```
Browser ──► https://admin.openfolio.test ──► admin host ─┬─ /*      ──► the admin SPA
                                                          └─ /api/*  ──► https://gateway.openfolio.test

admin host ──► https://gateway.openfolio.test ──► gateway :443 ─┬─ /api/auth/*  ──► api 127.0.0.1:3001 /auth/*
                                                                 ├─ /api/admin/* ──► api /auth/resolve ──► api /admin/*
                                                                 └─ anything else ──► 404
portfolio (next dev) ──► https://api.openfolio.test ──► gateway :443 ── GET /public/* ──► api /public/*
```

In development `api` listens on loopback and is reached through `gateway`. Nothing depends on that:
`gateway` sends `X-Api-Key` on every request to `api`, and `api` answers `401` on `/auth/*` and
`/admin/*` without it (FR-EDGE-5).

### 1. Hostnames

The dev domain is `openfolio.test`, with every name under it resolving to loopback. Add to the hosts
file (`C:\Windows\System32\drivers\etc\hosts`, or `/etc/hosts`):

```
127.0.0.1  admin.openfolio.test gateway.openfolio.test api.openfolio.test
```

Any domain whose records point at `127.0.0.1` serves equally well — the hostnames are
`GATEWAY_ADMIN_HOST` and `PUBLIC_READ_HOST`, not code. `admin.openfolio.test` is the admin
host's name; `gateway` closes the connection on it.

### 2. Certificate

A locally-trusted wildcard certificate from [mkcert](https://github.com/FiloSottile/mkcert), in
`gateway/certs/` (gitignored):

```
mkcert -install
mkcert -cert-file certs/openfolio.test.pem -key-file certs/openfolio.test-key.pem "*.openfolio.test"
```

### 3. Run order

1. **Database** — MongoDB, as `data-service/.env` points to it.
2. **`api`** — in `data-service/`: `npm run start:dev`. It binds `127.0.0.1:3001`.
3. **admin host** — in development, the admin dev server in `admin-panel/`, answering on
   `admin.openfolio.test` and forwarding `/api/*` to `https://gateway.openfolio.test` by the rules
   of FR-EDGE-9. `gateway` no longer serves the build.
4. **`gateway`** — in `gateway/`: copy `.env.example` to `.env`, set `GATEWAY_API_KEY` to the key in
   `GATEWAY_API_KEYS` of `data-service/.env`, then `npm install` and `npm run dev`.
5. **`portfolio`**, when needed — in `portfolio/`, with `PORTFOLIO_API_URL=https://api.openfolio.test`
   and `NODE_EXTRA_CA_CERTS` set to `rootCA.pem` in the directory `mkcert -CAROOT` prints, so that
   Node trusts the certificate: `npm run dev`.

Open `https://admin.openfolio.test`.
