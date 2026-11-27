# Cloud Foundry Generation

Read this reference only after the user explicitly specifies or selects CF for the current generation request, following the target-selection rule in [SKILL.md](../SKILL.md#mandatory-inputs). The common orchestration and result handling remain in [SKILL.md](../SKILL.md).

## Prerequisites and discovery

1. Ensure the CF CLI is available in the environment running the MCP server. Check the active target with `cf target`. Let the tool detect login; it never performs login itself.
2. If login is missing, use the exact login text defined in [SKILL.md](../SKILL.md#user-facing-wording), followed by the actual command returned by the tool in a separate shell code block. Have the user authenticate and target the intended org/space before retrying. Preserve that context during generation.
3. Use actual available remote discovery capabilities to resolve the base application ID. `cf services` lists service instances but does not establish which adaptable application IDs they expose. If application discovery is unavailable, use the interactive `yo @sap-ux/adp` wizard or SAP Fiori Tools generator to select the base application.
4. If the application ID is known, omit `serviceInstanceName` to use the tool's discovery: complete discovery with one match resolves automatically; multiple matches or incomplete discovery require explicit selection, and complete discovery with no matches is an error. Preserve an explicitly selected service instance. It is validated against live instances in the selected space and must expose the requested application; an explicit name does not bypass preflight.

Discovery uses existing service keys to pre-filter adaptable instances. An instance without business-service metadata in an existing key, missing credentials, or a failed probe is returned as unresolved. Even one confirmed match requires explicit selection when any instance remains unresolved. If no match appears, inspect the returned diagnostics, verify the instance and keys in the CF environment, or explicitly select a service instance to validate independently. Do not claim that unresolved choices expose the application. Do not treat a discovery failure as proof that an application does not exist.

## Configuration order

1. Ask whether to use an existing MTA or create a new one unless the user already specified this. Use the fixed existing-MTA label from [SKILL.md](../SKILL.md#user-facing-wording).
2. For an existing MTA, obtain its root as `appPath` or `targetFolder`. For a new MTA, obtain the parent folder and new MTA name. Explain which folder will be created or updated.
3. Collect an optional approuter preference and business solution name when relevant. Omission preserves the existing MTA's router or uses the new-project default defined by the schema.
4. Offer project name, namespace, and title preferences; otherwise leave them to defaults.

ABAP-specific `projectType`, `client`, and `importKeyUserChanges` are ignored for CF. Use the input schema and validation errors as the authority for all naming and destination constraints.

## Preflight and recovery

The tool validates local MTA/project inputs before remote application lookup. It then checks the selected service instance, service credentials and application catalog, downloads the base manifest/routes, and runs the same application and OData validators as the standalone generator. No project files are generated when preflight fails. Metadata access may create service keys or provision the HTML5 repository runtime service.

For validation errors, use the returned field/code/message and available choices. Do not infer a valid service from its display name or from a previous choice alone; every call checks the current space again. Use the common status/phase handling in [SKILL.md](../SKILL.md).

## MTA name-conflict recovery

When validation reports that a requested new MTA name or destination conflicts with an existing MTA, offer the two MTA choice labels from [SKILL.md](../SKILL.md#user-facing-wording) exactly, with no parenthesized descriptions. Offer reuse only after establishing that the conflicting path is an existing MTA project. An occupied folder alone is not a reusable MTA.

- For the existing-MTA choice, set `mtaMode: "existing"`, use the existing MTA root as the generation folder, and omit `mtaId`.
- For the different-name choice, retain `mtaMode: "new"` and collect a different `mtaId`. Preserve the valid parent folder; if the selected folder itself is an MTA, resolve an appropriate parent folder first.

Retry with the updated configuration and let the tool enforce validation again. Preserve unrelated choices, including the base application and service instance.

## Example: new MTA

~~~json
{
  "targetEnvironment": "CF",
  "application": "<base-application-id>",
  "appPath": "<absolute-parent-folder>",
  "mtaMode": "new",
  "mtaId": "my-mta",
  "projectName": "my.variant"
}
~~~

## Example: existing MTA

~~~json
{
  "targetEnvironment": "CF",
  "application": "<base-application-id>",
  "appPath": "<absolute-mta-root>",
  "mtaMode": "existing",
  "serviceInstanceName": "<verified-live-instance>"
}
~~~

Replace placeholders with resolved values. Store `mtaRoot` as the containing MTA and `projectPath` as its adaptation application subfolder. Pass only `projectPath` to editor tools.
