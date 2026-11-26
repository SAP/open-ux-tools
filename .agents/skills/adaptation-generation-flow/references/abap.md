# ABAP Generation

Read this reference only after the user explicitly specifies or selects ABAP for the current generation request, following the target-selection rule in [SKILL.md](../SKILL.md#mandatory-inputs). The common orchestration and result handling remain in [SKILL.md](../SKILL.md).

Use the exact ABAP environment label defined in [SKILL.md](../SKILL.md#user-facing-wording) when presenting the ABAP choice. Its tool value remains `ABAP`; project-type values are unchanged.

## Select the system and base application

1. Reuse the stored SAP system name supplied by the user. If none was supplied, call `list_sap_systems` and ask the user to select a system. Pass the selected system name as `system`. Do not collect credentials in chat.
2. Reuse the base application's technical ID supplied by the user. If it is missing, ask for it. Pass it as `application`.
3. Obtain the absolute parent folder for the generated project and continue with the configuration below. Preserve inputs and choices the user has already supplied.

The `generate_adaptation_project` tool validates backend access, application availability, and manifest loading. Follow the main skill's guidance for handling `InputRequired` and `Error` responses.

## Configuration order

Collect any supplied SAP client, project name/title/namespace preferences, and whether the user wants to import key user changes.

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
