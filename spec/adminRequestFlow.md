%% Openfolio — authenticated admin request flow
%% Covers the per-request path only. Sign-in is a separate diagram.
%% Normative source: srs.md v0.13 §2.6, FR-AUTH-3, FR-AUTH-10..12, FR-AUTH-18..20, FR-EDGE-1..10.
%% If this diagram and srs.md disagree, srs.md wins.

sequenceDiagram
    autonumber
    participant B as Browser · admin panel
    participant H as admin host · static host
    participant G as gateway · Node.js service
    participant AU as api · auth module
    participant AD as api · admin surface
    participant D as MongoDB

    Note over B,H: Access cookie of_at is httpOnly, Secure, SameSite=Lax,<br/>host-only to admin.openfolio.site, Path=/api.<br/>The refresh cookie of_rt is Path=/api/auth and is not sent here.<br/>The admin app never reads or writes either.

    B->>H: GET /api/admin/portfolio/sections<br/>Cookie: of_at=access JWT

    Note over H: Pass-through (FR-EDGE-9). Holds no secret and no session,<br/>sets no X-User-Id and no X-Api-Key, caches nothing.

    H->>G: same method, path, query, body and Cookie,<br/>to GATEWAY_ADMIN_HOST, plus X-Forwarded-*

    Note over G: Host matched exactly, then the /api/admin/ prefix.<br/>gateway holds one secret, the API key, and no signing key.<br/>It does not parse or verify the cookie.

    G->>AU: identity subrequest (FR-EDGE-3)<br/>GET /auth/resolve — Cookie, X-Request-Id, X-Api-Key, no body, 2 s timeout
    AU->>AU: check X-Api-Key in constant time (FR-EDGE-5)
    AU->>AU: verify access JWT — HS256, accepted kid, signature, exp
    Note over AU,D: Zero database reads and no writes.<br/>sessions and users are not consulted, so revocation<br/>and suspension take effect at the next refresh (FR-AUTH-11).

    alt key invalid, or JWT absent, invalid or expired
        AU-->>G: 401, no body
        G-->>H: 401, propagated
        H-->>B: 401, unchanged
        Note over G,AD: admin surface is never called
        Note over B: The admin app calls POST /api/auth/refresh once<br/>and retries the request once (FR-AUTH-20).<br/>A 401 from the refresh sends the tenant to sign-in.
    else timeout, or any answer other than 204 with a well-formed X-User-Id
        G-->>H: 502
        H-->>B: 502, unchanged
    else valid
        AU-->>G: 204<br/>X-User-Id: sub of the access JWT

        G->>AD: GET /admin/portfolio/sections<br/>X-User-Id and X-Api-Key, each overwriting any inbound value

        AD->>AD: reject without a valid X-Api-Key (401, before any guard)
        AD->>AD: read X-User-Id, reject if absent or malformed
        Note over AD: No cookie parsing, no session lookup, no users read.<br/>X-User-Id is trusted only because the request carries<br/>the API key gateway alone holds (FR-EDGE-5) and gateway<br/>sets the header unconditionally (FR-EDGE-4).<br/>The key authenticates the caller, not the session.

        AD->>D: resolve portfolio from userId,<br/>scope every query by it
        D-->>AD: rows
        AD-->>G: response
        G-->>H: response, untouched
        H-->>B: response, untouched
    end
