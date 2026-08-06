# Scope: Cookie-based OIDC SSO for ABAP cloud systems (reentrance-ticket / ADT destinations)

## Status
Scoping only — no implementation yet. Written after investigating why an ADT
`protocol: http`, `authenticationKind: reentranceticket` destination
(`systemUrl: https://<host>:44301`) fails to connect from the SAP Systems
Connection Manager while it works in the ADT (adt-ls) VS Code extension.

## Problem
`@sap-ux/axios-extension` supports two browser-logon mechanisms for ABAP cloud:
- **Reentrance ticket** (`src/auth/reentrance-ticket/`): opens
  `{{uiHost}}/sap/bc/sec/reentrance?...`, reads a `reentrance-ticket` query param
  back on a localhost redirect, sends it as the `MYSAPSSO2` header.
- **UAA OAuth** (`src/auth/uaa.ts`): client-credentials / refresh-token against a
  BTP service key (`ServiceInfo`). Not an interactive browser code flow.

Neither matches how the failing server actually authenticates.

## What the failing server actually does (verified against the live system)
- `GET /sap/bc/sec/reentrance` → **404** (axios-extension's endpoint does not exist here).
- `GET /.well-known/sap-adt-info` → **404** (so ADT's OAuth-metadata discovery finds nothing).
- `GET /sap/bc/adt/*` (discovery, sessions, reentranceticket) → **302** to
  `https://<idp>.accounts400.ondemand.com/oauth2/authorize?...` with:
  - `response_type=code`, `scope=openid`, server-supplied `client_id`, `state`, `nonce`
  - `redirect_uri=https://<host>:44301/sap/public/bc/sec/oidc/redirect`
    — i.e. the callback points **back to the ABAP server's own OIDC redirect handler**,
    NOT to a client/localhost callback.
- Following the IdP `authorize` URL returns **200** (the IdP login page).

### Conclusion
This is **server-side OIDC / browser SSO**: the ABAP server (as the OIDC relying
party) drives the whole handshake and, on success, establishes a **session cookie**.
The client's role is only to complete the login in a browser and reuse the resulting
session. This is distinct from:
- ADT's client-side **OAuth authorization-code + PKCE** flow
  (`OAuthAuthenticationHandler`), which requires `/.well-known/sap-adt-info` OAuth
  metadata — absent here (404). See the ADT PKCE spec captured separately if a
  well-known-advertising system needs supporting later.
- The **reentrance-ticket** flow (wrong endpoint, 404 here).

## Proposed approach: cookie-based browser SSO
High level, mirroring how a browser naturally authenticates:
1. Open the system URL (or a protected ADT path, e.g.
   `{{systemUrl}}/sap/bc/adt/discovery`) in the user's browser.
2. The ABAP server 302s to the IdP; the user authenticates; the IdP redirects back
   to the server's `/sap/public/bc/sec/oidc/redirect`; the server sets a session cookie.
3. The client must obtain that established session. Options to evaluate:
   - **(A) Loopback capture**: cannot use the OIDC `code` directly — the
     `redirect_uri` is fixed to the server, not localhost — so a naive
     localhost-callback capture (as reentrance-ticket does) will not receive it.
   - **(B) Shared cookie / external browser + cookie hand-off**: after the user
     completes SSO in a browser, obtain the `SAP_SESSIONID*` / OIDC session cookie
     for the host and attach it to subsequent axios requests. Mechanism for
     capturing the cookie from an external browser is the crux (VS Code has no
     cookie jar access to the system browser).
   - **(C) Embedded webview / auth broker**: drive the login inside a controllable
     web context (e.g. a VS Code webview or a headless flow) so the cookie is
     observable to the extension, then reuse it. Heaviest but most reliable.
   - **(D) Reuse adt-ls**: if adt-ls is installed, ask it (via the command/LSP work
     already added for HTTP-endpoint resolution) to perform the logon and hand back
     a usable session, instead of re-implementing OIDC in axios-extension.

## Open questions (to resolve before implementing)
1. Which cookie(s) constitute the authenticated session on this server, and are they
   `HttpOnly`/`Secure`/host-scoped in a way a Node client can reuse?
2. Is there any client-observable callback at all, or is the session entirely
   server-cookie based (pointing to option C or D)?
3. Should this live in `@sap-ux/axios-extension` as a new auth mechanism, or should
   `sap-systems-ext` delegate cloud logon to adt-ls (option D) to avoid duplicating a
   full OIDC/browser-SSO implementation?
4. How does the token/cookie lifetime and refresh work for long-lived Connection
   Manager use?

## Non-goals for this scope
- Implementing ADT's client-side PKCE `OAuthAuthenticationHandler` (separate case,
  only relevant for systems that advertise `/.well-known/sap-adt-info`).
- Changing the reentrance-ticket endpoint globally (`/sap/bc/sec/reentrance` is
  correct for genuine reentrance systems; this server simply is not one).

## Already shipped (related, committed)
- Merge of ADT HTTP destinations into the store as ABAP-on-BTP systems + ADT-owned
  UI marker + write-back to `destinations.json`.
- axios-extension virtual-host fallback so reentrance connections no longer crash
  when `/sap/public/bc/icf/virtualhost` returns `{}`.
