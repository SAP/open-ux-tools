---
"@sap-ux/fiori-mcp-server": minor
---

FEAT: promote static functionalities to top-level MCP tools

Promotes generate-fiori-ui-application, generate-fiori-ui-application-cap, fetch-service-metadata, and list-systems to dedicated top-level tools (generate_fiori_app_odata, generate_fiori_app_cap, download_odata_service_metadata, list_sap_systems), removing them from the 3-step list/get_details/execute workflow. Reduces round-trips for generation workflows from 3 calls to 1. Updates list_functionality description to reflect its focused scope on app-modification operations. Errors from fetch-service-metadata now return a structured { status: "Error", message } response instead of propagating as unhandled exceptions. getSapSystems no longer fetches sensitive credentials when called from listSapSystems. Generator wrappers use proper Zod-inferred types instead of Record<string, unknown>.
