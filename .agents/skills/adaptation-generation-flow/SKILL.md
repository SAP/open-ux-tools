---
name: adaptation-generation-flow
description: >
  Generate a SAP Fiori adaptation project for an existing application on ABAP or
  Cloud Foundry. Use for "create an adaptation project", "adapt an ABAP app", or
  "generate a CF app variant". Discover prerequisites and base applications,
  collect configuration, handle tool choices, and return the generated project path.
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
---

# SAP Fiori Adaptation Project Generation

Create an adaptation project with `generate_adaptation_project`. Guide the user through environment selection and configuration, then report the generated application root. Validation belongs to the tool and standalone generator; use their reported errors rather than maintaining validation algorithms in this skill.

## Example User Prompts

- "Create an adaptation project for this ABAP application."
- "Generate a Cloud Foundry adaptation project in a new MTA."
- "Adapt this application inside my existing MTA."
- "Create an adaptation project for this application in the selected folder."

## Prerequisites

- SAP Fiori MCP server with ADP tools enabled using `SAP_FIORI_MCP_ADP_TOOLS=true`.
- **Backend:** an existing adaptable ABAP application (including RAP applications), or a CF application exposed by a live service instance. This skill does not create CAP or RAP services.
- **OData:** V2 or V4 as supported by the base application. Preserve its service contract; the generator validates application compatibility.
- **Hosts:** GitHub Copilot in VS Code/BAS or Claude with MCP access. Use available system discovery tools; a host-specific extension is optional for CLI generation.
- Without MCP, use the installed standalone `yo @sap-ux/adp` generator. Its interactive wizard collects the configuration and enforces validation independently.
- **Scope:** create local project files and update a selected existing MTA when applicable. CF preflight may create service keys or provision the HTML5 repository runtime service while downloading base application metadata. Generation does not deploy the application.

## Mandatory Inputs

Obtain the intended ABAP/CF target, base application ID, and absolute generation folder from the user's request or workspace. Ask for the target if unspecified; system names and other parameters do not imply a target. Preserve choices already supplied by the user.

Consult only the selected environment's guidance:

- [ABAP prerequisites, application discovery, and configuration](references/abap.md)
- [CF prerequisites, application discovery, and MTA configuration](references/cf.md)

Exact supported values, defaults, and conditional requirements are defined by the tool input schema. Obtain missing conditional inputs before generation, including the MTA name when creating a new MTA.

## Workflow

### Step 1 — Select the environment

Resolve ABAP or CF from explicit user intent. If absent, present those two choices and wait for the answer. Read the corresponding reference above. Confirm that the chosen target matches the backend hosting the base application.

### Step 2 — Resolve prerequisites and the base application

Follow the environment reference to discover systems, service instances, and applications. Use only tools actually available in the host. `list_fiori_apps` scans local projects; it is not a remote application catalog. If remote discovery is unavailable, use the documented interactive generator fallback rather than inventing tool names or application IDs.

Verify the application ID and selected backend context before collecting project configuration. Recover missing prerequisites according to tool diagnostics; CF login is performed by the user.

### Step 3 — Collect configuration

Collect the destination and environment-specific choices described in the reference. Reuse user-provided values. Offer optional project name, namespace, and application title; let the generator supply defaults when the user has no preference. Explain that an existing MTA will be updated, or a new project created, using the selected destination.

### Step 4 — Generate and handle structured results

Call `generate_adaptation_project` with the collected inputs. The tool performs preflight on every call, including the first, and invokes the creation command only after all applicable checks pass. Keep the same configuration through recovery and adjust only the requested fields.

Before calling the tool, collect the required values and use the exact schema parameter names, including `serviceInstanceName`. Omit optional values when no preference was supplied; do not send blank strings or unknown parameters. Do not invoke Yeoman directly to test whether a configuration is valid.

Preflight covers:

- Schema types, supported values, nonempty supplied strings, and unknown or misspelled fields.
- Absolute paths, destination directory/write access, project name, namespace, and resolved defaults.
- ABAP system access, SAP client, base application availability and manifest access, supported project type, and requested key user changes.
- CF login/org/space, MTA mode/name/path and space consistency, and applicable approuter/business solution configuration.
- The selected CF service instance's presence in the current space, service credentials, and whether it exposes the requested application. Explicit service names receive the same checks as discovered names.
- CF application manifest compatibility and OData route/endpoint consistency using the standalone generator's validators.

The input schema and shared code remain authoritative; do not copy their naming patterns or eligibility algorithms into this skill. Backend checks require access to the selected backend.

| Status | Action |
| --- | --- |
| `InputRequired` | Read `missingFields` and `choices`. Present each relevant choice using its label, collect the answer, then retry with its value. No project files have been generated. |
| `Error` with `phase: "validation"` | Creation was not invoked. Use each `issues[].field`, `code`, and `message` to identify corrections or prerequisite recovery. If `choices` are supplied, present them. Correct all reported independent fields together and retry with the retained configuration. |
| `Error` with `phase: "generation"` | Preflight passed, but creation failed. Inspect the diagnostic and destination for partial output before retrying. Do not relabel this as an input validation failure or repeatedly invoke creation with unchanged inputs. |
| `Success` | Store `projectPath` as the adaptation application root and `mtaRoot` separately for CF. Verify the generated files before reporting completion. |

The tool remains usable without this skill. Do not implement a second set of validation rules or override a tool validation error based on this document.

### Step 5 — Verify and hand off

Verify `webapp/manifest.appdescr_variant` and `package.json` inside the returned `projectPath`. For CF, also verify `mta.yaml` at `mtaRoot`. Report the application path and selected environment.

If the user requested UI changes, continue with [adp-controller-extension](../adp-controller-extension/SKILL.md), passing `projectPath` as `appPath`. Generation alone does not require opening the editor.

## Verification Checklist

- [ ] The target environment comes from explicit user intent.
- [ ] Backend prerequisites and the base application are resolved.
- [ ] Required configuration is collected; schema defaults remain authoritative.
- [ ] All supplied parameters pass tool preflight before the creation command is invoked.
- [ ] Missing inputs, choices, and validation/generation phases are handled using structured tool results.
- [ ] Success points to the adaptation application root and generated files exist.
- [ ] Any requested editor work receives the verified application path.

## Testing

Inspect the scripts in the generated application's `package.json` and run its build script. Consult [sap-fiori-app-development](https://github.com/SAP/open-ux-tools/blob/main/plugins-coding-agents/fiori/skills/sap-fiori-app-development/SKILL.md) for general preview setup.

## Common Errors and Solutions

| Diagnostic | Recovery |
| --- | --- |
| `service_instance_not_found` | Correct `serviceInstanceName` using a live instance in the current org/space; present returned choices. |
| `application_not_found` | Verify the ABAP system or selected CF service exposes the requested application; use returned application choices when supplied. |
| `service_credentials_unavailable` | Resolve service key/credential access for the selected live instance before retrying. |
| `unsupported_application` / `inconsistent_odata_endpoints` | Select an adaptable base application or correct its manifest/routes/endpoints according to the shared validator diagnostic. |
| `unrecognized_keys` | Correct misspelled parameter names using the input schema. |
| `generation_failed` | Inspect the creation diagnostic and any partial output, resolve the cause, then retry. |
| `targetEnvironment is required before generation.` | Collect ABAP or CF and pass the selected value. |
| `system is required for an ABAP project.` | Resolve the user's system using available system discovery and pass its stored name. |
| `mtaId is required when mtaMode is new.` | Collect the new MTA name and retry; let the tool validate it. |
| `Multiple Cloud Foundry service instances expose application ...` | Present `choices.serviceInstanceName` and retry with the selected value. |
| `The Cloud Foundry CLI ("cf") is not installed.` | Install the CF CLI in the environment running the MCP server. |
| `You are not logged in to a Cloud Foundry org and space.` | Have the user run the login command from the diagnostic and target the intended org/space. |
| `No Cloud Foundry service instance ... exposes application ...` | Verify the target org/space, application ID, and service instance using the CF reference. |

## References

- [Adaptation project generator and CLI usage](https://github.com/SAP/open-ux-tools/tree/main/packages/generator-adp)
- [SAP Fiori MCP server](https://www.npmjs.com/package/@sap-ux/fiori-mcp-server)
- [Cloud Foundry CLI documentation](https://docs.cloudfoundry.org/cf-cli/)
