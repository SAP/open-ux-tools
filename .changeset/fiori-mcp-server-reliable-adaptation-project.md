---
"@sap-ux/fiori-mcp-server": patch
---

FIX: Make generate_adaptation_project reliable. The JSON payload is now passed to the generator as a single argv element (via spawn) instead of being interpolated into a shell string, so values containing quotes/apostrophes can no longer corrupt it and silently drop the generator into an interactive prompt that hangs forever. The child process output is streamed (no 1 MB maxBuffer limit) and an overall generation timeout terminates a stuck generator. The optional key user changes fetch (importKeyUserChanges) is now guarded by a timeout so it cannot hang indefinitely before generation starts.
