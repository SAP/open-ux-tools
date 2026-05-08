---
"@sap-ux/fiori-mcp-server": minor
---

feat(fiori-mcp-server): promote static functionalities to top-level MCP tools

Promotes generate-fiori-ui-application, generate-fiori-ui-application-cap, fetch-service-metadata and list-systems to dedicated top-level tools (generate_fiori_app_odata, generate_fiori_app_cap, download_odata_service_metadata, list_sap_systems), removing them from the 3-step list/get_details/execute workflow. Reduces round-trips for generation workflows from 3 calls to 1. Updates list_functionality description to reflect its focused scope on app-modification operations.
