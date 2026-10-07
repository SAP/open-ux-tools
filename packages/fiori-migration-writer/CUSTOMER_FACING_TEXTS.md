# Customer-Facing Texts for Review

**For**: @lfindlaysap (Text Review)  
**Package**: fiori-migration-writer  
**PR**: #4995

---

## 1. Localized Messages (src/i18n/i18n.json)

### Error Messages:
- **ERROR_FAILED_TO_GET_PROJECT_INFO**: "Cannot determine the project info for the selected project."
- **ERROR_FLOOR_PLAN_NOT_SUPPORTED**: "The {{floorPlan}} floorplan is not supported for migration. Please choose a compatible floorplan."
- **ERROR_NOT_SUITABLE_FOR_MIGRATION**: "This project type is not supported for migration. Please choose a compatible project."
- **ERROR_READING_FILE**: "An error occurred reading the {{filename}} file."
- **ERROR_SYNTAX**: "A syntax error occurred."
- **ERROR_SYNTAX_FILENAME**: "A syntax error occurred in {{filename}}. Ensure the file is valid."
- **ERROR_PERMISSION**: "A permission error occurred. Ensure your project files are accessible."
- **ERROR_PERMISSION_FILE**: "A permission error occurred in {{filename}}. Ensure the file is accessible."
- **ERROR_COMMAND_FAILED**: "The command failed due to an error. Please try again."
- **COMMAND_FAILED_WITH_ERROR**: "The {{command}} command failed with the {{errorCode}} error code. Please try again."
- **ERROR_CODE_RETURNED**: "The {{errorCode}} error code returned from the {{command}} command. Error: {{stack}}"

### Success Messages:
- **SUCCESSFULLY_MIGRATED_MSG**: "Project migrated."

### Informational Messages:
- **MIGRATION_COL_INFO**: "Application Information"
- **MIGRATION_NO_BACKEND_URL**: "An update is required to add a back-end URL in the YAML files to preview the application locally. For more information, click here."
- **MISSING_METADATA_CONFIG**: "The project is missing a local copy of the service metadata which is required for SAP Fiori tools. To launch the Service Manager and sync with the back end to update the local metadata, click here."
- **MISSING_MANIFEST_UI5_SECTION**: "The project `manifest.json` file is missing the `sap.ui5` section. This can cause issues when using this project with SAP Fiori tools."

### Warning Messages:
- **TYPESCRIPT_STRICT_MODE_WARNING**: "Project configured with TypeScript. If type errors occur, this may be due to a version upgrade. Review the TypeScript version in the `package.json` file."

### Debug Messages (developer-facing):
- **DEBUG_LOG_MSG_LOGGING_LEVEL_CONFIGURED**: "Logging level configured to {{logLevel}}."

---

## 2. Hard-coded Error Messages in Source Code

These error messages are thrown directly and may be shown to users:

### From src/migration-process/legacy-helpers.ts:
- "Path contains unsafe characters"
- "Root directory does not exist"
- "Git path cannot be empty or root"
- "Git path escapes root directory"
- "Git path contains control characters"

### From src/utils/fs-adapter.ts:
- "Editor not available. Call runWithEditor() to set up migration context."

### From src/BulkProjectMigrator.ts:
- "Failed to commit migration changes: {{error.message}}"

---

## 3. Recommendations

### Messages That Should Be Localized:
The following hard-coded messages appear in user-facing error paths and should be moved to i18n.json:

**High Priority:**
1. Path validation errors (legacy-helpers.ts)
2. Editor context error (fs-adapter.ts)
3. Commit failure message (BulkProjectMigrator.ts)

---

## 4. Review Checklist

- [ ] **Consistency**: Is the tone consistent across all messages? (formal vs. informal)
- [ ] **Clarity**: Are technical terms clear to the target audience?
- [ ] **Actionability**: Do error messages provide clear next steps?
- [ ] **Grammar**: "back-end" vs "backend" - which should be used consistently?
- [ ] **Terminology**: "floorplan" vs "floor plan" - standardize
- [ ] **Link text**: Messages with "click here" should have descriptive link text
- [ ] **Formatting**: Are code elements (manifest.json, package.json) formatted correctly for VS Code UI?

---

## 5. Questions for Review

1. Should "back-end" be "backend" for consistency?
2. Should error messages be more specific about recovery steps?
3. Are the hard-coded path validation errors acceptable, or must they be localized?
4. Is "floorplan" one word or "floor plan"?
5. Should "click here" links have more descriptive text?
