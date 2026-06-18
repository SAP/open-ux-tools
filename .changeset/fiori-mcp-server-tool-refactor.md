---
"@sap-ux/fiori-mcp-server": minor
---

FEAT: promote static functionalities to top-level MCP tools

Promotes generate-fiori-ui-application, generate-fiori-ui-application-cap, fetch-service-metadata, and list-sap-systems to dedicated top-level MCP tools, removing them from the 3-step list/get_details/execute workflow. Reduces round-trips for generation workflows from 3 calls to 1. list_sap_systems and download_odata_service_metadata are environment-aware: on SAP Business Application Studio they use BTP destinations, on VSCode they use the Fiori tools system store. download_odata_service_metadata returns a destination field on BAS which must be passed into the generator service config. Errors from fetch-service-metadata return a structured response instead of propagating as unhandled exceptions. Entity names in generator config are normalised by stripping wrapping single quotes. Generator wrappers use Zod-inferred types instead of Record<string, unknown>.
