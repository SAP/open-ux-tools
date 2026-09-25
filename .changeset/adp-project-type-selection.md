---
"@sap-ux/fiori-mcp-server": minor
---

FEAT: Let generate_adaptation_project select the adaptation project type instead of always producing CloudReady. When the system and application support both CloudReady and Classic (on-premise) projects, the tool now returns status 'InputRequired' so the user can be asked which type to generate; single-type systems resolve automatically and an unsupportable requested projectType is rejected with an Error.
