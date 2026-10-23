---
"@sap-ux/fiori-mcp-server": patch
---

Add a headless Firefox transport for the ADP RTA workflow, driven via geckodriver over the WebDriver protocol. Selected with `SAP_FIORI_MCP_ADP_FIREFOX_WD=true`, it runs without a display server (suitable for SAP Business Application Studio) and falls back to the default Playwright/Chromium transport when unset.
