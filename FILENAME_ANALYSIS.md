# FileName Missing Values Analysis

## What's in project-access but missing in fiori-migration-writer's old definition?
✅ Already there:
- ExtConfigJson ✅
- Pom ✅  
- XSAppJson ✅ (project-access uses XSAppJson, migration-writer had XsApp)

## What's in fiori-migration-writer but missing in project-access?
❌ Missing:
- NeoApp: 'neo-app.json' - **USED in migration-writer code!**
- Component: 'Component.js' - but this is in TemplateFileName, not FileName
- IndexHtml: 'index.html' - but this is in TemplateFileName, not FileName

## Action Required

### 1. Add NeoApp to project-access ✅
fiori-migration-writer uses `FileName.NeoApp` in actual code:
```typescript
// src/migration-process/legacy.ts
const neoapp = join(rootPath, FileName.NeoApp);
```

We need to contribute this back to project-access:
```typescript
NeoApp: 'neo-app.json',
```

### 2. Fix XsApp → XSAppJson ✅
project-access uses `XSAppJson` (all caps), migration-writer had `XsApp`.
Since we're now importing from project-access, use their naming: `FileName.XSAppJson`

### 3. Component and IndexHtml ✅
These are NOT in FileName - they're in TemplateFileName (templates, not actual project files).
No action needed - different concern.

## Summary
- Import FileName from project-access ✅ DONE
- Add FileName.NeoApp to project-access (contribute upstream)
- Update usage from XsApp → XSAppJson
