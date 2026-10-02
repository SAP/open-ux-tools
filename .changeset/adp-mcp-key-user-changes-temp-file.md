---
"@sap-ux/fiori-mcp-server": patch
---

FIX: generate_adaptation_project now imports key user changes again. The @sap-ux/generator-adp generator reads key user changes from a temp file keyed by the correlation `id` (`{os.tmpdir()}/{id}.txt`) rather than from the CLI JSON payload (since generator-adp #5079), but the MCP tool still passed them inline, so they were silently dropped. The tool now stages the fetched changes into that temp file, hands over the matching `id`, and cleans the file up afterwards.
