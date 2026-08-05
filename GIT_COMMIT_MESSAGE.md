feat(create): add --no-credentials flag for explicit handling of systems without credentials

## Why

While mock systems can use `--skip-check` or answer "Yes" to save anyway after 
connection failure, the `--no-credentials` flag provides explicit intent and 
better UX:

- **Clearer intent**: Explicitly marks systems as "no credentials needed" rather 
  than working around connection check failures
- **Fewer prompts**: Skips username/password prompts entirely instead of requiring 
  users to press Enter twice
- **Better for non-basic auth**: Suitable for `reentranceTicket`, `oauth2`, and 
  `oauth2ClientCredential` types that use browser-based authentication flows

## How it works

```bash
npx @sap-ux/create add system \
  --name "Mock System" \
  --url https://mock-system.example.com \
  --authenticationType reentranceTicket \
  --no-credentials
```

When `--no-credentials` is set:
1. Username/password prompts are skipped entirely
2. System is saved without credentials
3. Connection check still runs (unless `--skip-check` is also used)
4. 401 responses are treated as success for non-basic auth types

## Use cases

- Mock/test systems that don't require authentication
- Systems using browser-based auth flows (reentranceTicket, oauth2)
- Scenarios where credentials will be provided later via `update system`
- Explicitly marking systems that don't need stored credentials

## Alternative approaches

Users can still use existing approaches:
- `--skip-check` + press Enter for username/password prompts
- Let connection check fail, answer "Yes" to save anyway

The `--no-credentials` flag simply provides a more explicit and ergonomic option.
