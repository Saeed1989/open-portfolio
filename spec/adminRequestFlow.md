%% Openfolio — authenticated admin request flow
%% Covers the per-request path only. Sign-in is a separate diagram.
%% Normative source: srs.md v0.7 §2.6, FR-AUTH-3, FR-AUTH-8..13.
%% If this diagram and srs.md disagree, srs.md wins.

sequenceDiagram
    autonumber
    participant B as Browser · admin panel
    participant G as gateway · admin host /api/*
    participant AU as api · auth module
    participant AD as api · admin surface
    participant D as MongoDB

    Note over B,G: Cookie is httpOnly, Secure, SameSite=Lax,<br/>host-only, Path=/api.<br/>The admin app's own server never sees it.

    B->>G: GET /api/admin/portfolio/sections/projects<br/>Cookie: session=raw token

    G->>AU: POST /auth/resolve<br/>raw token + shared secret
    Note over G: gateway holds no DB connection<br/>and owns no collection
    AU->>AU: sha256 of raw token
    AU->>D: sessions by tokenHash, join users.status
    D-->>AU: session + user, or null

    alt not found, revoked, idle > 30d, age > 90d, or user suspended
        AU-->>G: unresolved
        G-->>B: 401
        Note over G,AD: admin surface is never called
    else valid
        opt idleExpiresAt stale by more than 1h
            AU->>D: refresh idleExpiresAt
        end
        AU-->>G: session doc + userId

        G->>AD: GET /admin/portfolio/sections/projects<br/>X-User-Id + shared secret
        Note over G,AD: session token never crosses this boundary

        AD->>AD: check shared secret only
        Note over AD: no session lookup, no users read,<br/>no re-verification — gateway already resolved

        AD->>D: resolve portfolio from userId,<br/>scope every query by it
        D-->>AD: rows
        AD-->>G: response
        G-->>B: response, untouched
    end