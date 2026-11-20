# Cloud Foundry Generation

Read this reference after the user selects CF. The common orchestration and result handling remain in [SKILL.md](../SKILL.md).

## Prerequisites and discovery

1. Ensure the CF CLI is available in the environment running the MCP server. Check the active target with `cf target`. Let the tool detect login; it never performs login itself.
2. If login is missing, present the command returned by the tool. Have the user authenticate and target the intended org/space before retrying. Preserve that context during generation.
3. Use actual available remote discovery capabilities to resolve the base application ID. `cf services` lists service instances but does not establish which adaptable application IDs they expose. If application discovery is unavailable, use the interactive `yo @sap-ux/adp` wizard or SAP Fiori Tools generator to select the base application.
4. If the application ID is known, omit `serviceInstanceName` to use the tool's discovery: one match resolves automatically, multiple matches are returned as structured choices, and zero matches is an error. Preserve an explicitly selected service instance. It is validated against live instances in the selected space and must expose the requested application; an explicit name does not bypass preflight.

Discovery uses existing service keys to pre-filter adaptable instances. An instance without an existing key may be absent from discovery. If no match appears, verify the instance and keys in the CF environment, or pass a verified `serviceInstanceName` explicitly. Do not treat a discovery failure as proof that an application does not exist.

## Configuration order

1. Ask whether to use an existing MTA or create a new one unless the user already specified this.
2. For an existing MTA, obtain its root as `appPath` or `targetFolder`. For a new MTA, obtain the parent folder and new MTA name. Explain which folder will be created or updated.
3. Collect an optional approuter preference and business solution name when relevant. Omission preserves the existing MTA's router or uses the new-project default defined by the schema.
4. Offer project name, namespace, and title preferences; otherwise leave them to defaults.

ABAP-specific `projectType`, `client`, and `importKeyUserChanges` are ignored for CF. Use the input schema and validation errors as the authority for all naming and destination constraints.

## Preflight and recovery

The tool validates local MTA/project inputs before remote application lookup. It then checks the selected service instance, service credentials and application catalog, downloads the base manifest/routes, and runs the same application and OData validators as the standalone generator. No project files are generated when preflight fails. Metadata access may create service keys or provision the HTML5 repository runtime service.

For validation errors, use the returned field/code/message and available choices. Do not infer a valid service from its display name or from a previous choice alone; every call checks the current space again. Use the common status/phase handling in [SKILL.md](../SKILL.md).

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
