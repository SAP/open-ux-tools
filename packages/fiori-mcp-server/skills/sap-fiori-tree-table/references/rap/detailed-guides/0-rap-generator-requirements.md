# RAP Generator Requirements (Read-Only & Editable Hierarchies)

## CRITICAL: Generator Schema Requirements

When using the RAP generator for **ANY** hierarchy type (read-only or editable), you **MUST** include the `metadata` object in the content JSON:

```json
{
  "metadata": {
    "package": "YOUR_PACKAGE_NAME"
  },
  "sessionId": "unique_session_id",
  "serviceConfiguration": {
    "applicationType": "readOnly",  // or "withDraft" for editable hierarchies
    "objectsNaming": {
      "prefix": "Z",
      "suffix": ""
    },
    "serviceNaming": {
      "projectName": "YOUR_PROJECT_NAME"
    },
    "useTableEntities": true
  },
  "businessEntities": [ ... ],
  "businessEntitiesFields": [ ... ]
}
```

## Key Requirements

- ✅ **Both required:** `packageName` tool parameter AND `metadata.package` in content JSON
- ✅ The generator reads the package from `metadata.package` in the content body
- ❌ **Common mistake:** Only passing `packageName` parameter without `metadata.package` causes validation error:
  ```
  "Object  of type DEVC does not exist."
  ```

**Example Usage:**
```typescript
// Tool parameter
packageName: "Z_MAINTENANCE"

// Content JSON
{
  "metadata": {
    "package": "Z_MAINTENANCE"  // ← Must match packageName parameter
  },
  "sessionId": "unique_session_id",
  // ... rest of content
}
```

## What the Generator Creates

The RAP generator creates these foundation objects:
- Database table(s) - Persistent storage
- Base/Interface view(s) - Data model layer
- Projection view(s) - Consumption layer
- Behavior definition(s) - Business logic
- Service definition - OData service exposure
- Service binding - OData protocol binding
- Metadata extension - UI annotations
- Access controls - Authorization
- SAP Object Type/Node Type - Business object registration
