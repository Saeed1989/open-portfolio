# edge

## Environment

Every value is validated at boot; `edge` refuses to start on a bad one. `.env.example` holds a
working development set.

| Variable | Required | Meaning |
|---|---|---|
| `ADMIN_HOST` | yes | Admin hostname, matched exactly. Bare hostname: no scheme, no port. |
| `PUBLIC_READ_HOST` | yes | Public-read hostname, matched exactly. Must differ from `ADMIN_HOST`. |
| `API_UPSTREAM` | yes | `api`'s private address, as an origin with no path — `http://127.0.0.1:3001`. |
| `ADMIN_DIST_DIR` | yes | Directory holding the admin SPA build. Must contain `index.html`. |
| `PORT` | yes | Port to listen on, all interfaces. |
| `TLS_CERT_PATH` | with `TLS_KEY_PATH` | PEM certificate covering both hostnames. Set both to terminate TLS in-process. |
| `TLS_KEY_PATH` | with `TLS_CERT_PATH` | PEM private key for that certificate. |
| `TRUSTED_PROXY_CIDRS` | no | Comma-separated addresses or CIDRs whose `X-Forwarded-For` and `X-Forwarded-Proto` are believed. Only without `TLS_*`; must be empty when `TLS_*` is set. Empty means nobody's is believed. |
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
Browser ──► https://admin.openfolio.test ──► edge :443 ─┬─ /api/auth/*  ──► api 127.0.0.1:3001 /auth/*
                                                        ├─ /api/admin/* ──► api /auth/resolve ──► api /admin/*
                                                        └─ /*           ──► admin-panel/dist
portfolio (next dev) ──► https://api.openfolio.test ──► edge :443 ── GET /public/* ──► api /public/*
```

`api` listens on loopback only and is reached through `edge`.

### 1. Hostnames

The dev domain is `openfolio.test`, with every name under it resolving to loopback. Add to the hosts
file (`C:\Windows\System32\drivers\etc\hosts`, or `/etc/hosts`):

```
127.0.0.1  admin.openfolio.test api.openfolio.test
```

Any domain whose records point at `127.0.0.1` serves equally well — the hostnames are
`ADMIN_HOST` and `PUBLIC_READ_HOST`, not code.

### 2. Certificate

A locally-trusted wildcard certificate from [mkcert](https://github.com/FiloSottile/mkcert), in
`edge/certs/` (gitignored):

```
mkcert -install
mkcert -cert-file certs/openfolio.test.pem -key-file certs/openfolio.test-key.pem "*.openfolio.test"
```

### 3. Run order

1. **Database** — MongoDB, as `data-service/.env` points to it.
2. **`api`** — in `data-service/`: `npm run start:dev`. It binds `127.0.0.1:3001`.
3. **admin build** — in `admin-panel/`: `npm run build`. `edge` serves `dist/` from disk, so rebuild
   to see a change.
4. **`edge`** — in `edge/`: copy `.env.example` to `.env`, then `npm install` and `npm run dev`.
5. **`portfolio`**, when needed — in `portfolio/`, with `PORTFOLIO_API_URL=https://api.openfolio.test`
   and `NODE_EXTRA_CA_CERTS` set to `rootCA.pem` in the directory `mkcert -CAROOT` prints, so that
   Node trusts the certificate: `npm run dev`.

Open `https://admin.openfolio.test`.
