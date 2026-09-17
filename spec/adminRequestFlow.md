%% Openfolio — authenticated admin request flow
%% Covers the per-request path only. Sign-in is a separate diagram.
%% Normative source: srs.md v0.8 §2.6, FR-AUTH-3, FR-AUTH-8..17, FR-EDGE-1..6.
%% If this diagram and srs.md disagree, srs.md wins.

sequenceDiagram
    autonumber
    participant B as Browser · admin panel
    participant E as edge · nginx
    participant AU as api · auth module
    participant AD as api · admin surface
    participant D as MongoDB

    Note over B,E: Cookie is httpOnly, Secure, SameSite=Lax,<br/>host-only, Path=/api.<br/>The admin app's own server never sees it.

    B->>E: GET /api/admin/portfolio/sections/projects<br/>Cookie: session=raw token

    Note over E: Host matched exactly, then the /api/admin/ location.<br/>edge holds no DB connection and owns no collection.

    E->>AU: auth_request subrequest<br/>GET /auth/resolve — inbound headers, no body
    AU->>AU: sha256 of raw token
    AU->>D: sessions by tokenHash
    D-->>AU: session, or null
    Note over AU,D: One read. users is not joined:<br/>suspension revokes sessions instead (FR-AUTH-11).

    alt not found, revoked, idle > 30d, or age > 90d
        AU-->>E: 401
        E-->>B: 401, propagated
        Note over E,AD: admin surface is never called
    else valid
        opt idleExpiresAt stale by more than 1h
            AU->>D: refresh idleExpiresAt
        end
        AU-->>E: 204<br/>X-User-Id: resolved userId

        E->>AD: GET /admin/portfolio/sections/projects<br/>X-User-Id, overwriting any inbound value

        AD->>AD: read X-User-Id, reject if absent or malformed
        Note over AD: no cookie parsing, no session lookup, no users read —<br/>the auth module already resolved. No signed token,<br/>key pair, or shared secret. Trustworthy only because<br/>api is not publicly routable (FR-EDGE-5) and edge<br/>sets the header unconditionally (FR-EDGE-4).

        AD->>D: resolve portfolio from userId,<br/>scope every query by it
        D-->>AD: rows
        AD-->>E: response
        E-->>B: response, untouched
    end