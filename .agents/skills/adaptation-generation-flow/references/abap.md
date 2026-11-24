# ABAP Generation

Read this reference only after the user explicitly specifies or selects ABAP for the current generation request, following the target-selection rule in [SKILL.md](../SKILL.md#mandatory-inputs). The common orchestration and result handling remain in [SKILL.md](../SKILL.md).

Use the exact ABAP environment label defined in [SKILL.md](../SKILL.md#user-facing-wording) when presenting the ABAP choice. Its tool value remains `ABAP`; project-type values are unchanged.

## Prerequisites and discovery

1. Reuse an explicitly supplied stored system. Otherwise use the Service Center MCP `list_systems` when available, or `list_sap_systems` as the fallback. Resolve the selected stored system name; do not collect credentials in chat.
2. Discover the base application's technical ID through available backend discovery capabilities. `list_fiori_apps` only finds local projects. If the host has no remote application discovery, use the SAP Fiori Tools adaptation project generator wizard or `yo @sap-ux/adp` interactively to select the application.
3. Confirm the base application and system. Preflight verifies that the system is accessible, the application is available for adaptation, and its manifest can be loaded. Unknown application IDs are rejected before creation, even when a project type is explicitly supplied. The skill does not reproduce application eligibility rules.

## Configuration order

Collect the generation parent folder, any supplied SAP client, project name/title/namespace preferences, and whether the user wants to import key user changes.

Pass an explicitly requested Cloud Ready or Classic type as `projectType`. Otherwise leave it unset: a single supported type resolves automatically. If the tool returns both choices, present `choices.projectType` and pass the selected value. Do not choose a default on the user's behalf.

If importing key user changes, explain that the tool fetches the DEFAULT adaptation from the selected backend. A fetch failure stops preflight before the creation command; use the field-level diagnostic to recover.

## Example

For a user who selected ABAP and supplied a base application ID:

~~~json
{
  "targetEnvironment": "ABAP",
  "system": "<stored-system-name>",
  "application": "<base-application-id>",
  "appPath": "<absolute-parent-folder>",
  "projectName": "my.variant"
}
~~~

Replace placeholders with resolved values. The tool returns the generated application folder as `projectPath`. Verify its descriptor before any editor handoff.
