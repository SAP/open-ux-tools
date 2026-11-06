---
"@sap-ux/fiori-mcp-server": minor
---

FEAT: Replace the RTA page-action steps (get_page_actions, call_page_action, press_interactive) with the generic Unified Frontend Actions describe_ui and execute_page_action. These are reached by requiring sap/ui/joule/frontend/util/ActionHelpers directly on the page (like FrontendActionsAPI for the Flex actions), so navigation needs no Joule webclient bridge and no sap-ui-xx-initializeJoule URL flag.
