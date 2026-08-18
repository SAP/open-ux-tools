// ESM re-export wrapper for @sap/ux-specification
// 1.144.10+ ships ESM-only (index-min.mjs).
// We load the real package directly by path to avoid Jest mock cycle resolution.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pkgPath = resolve(__dirname, '..', '..', '..', 'node_modules', '@sap', 'ux-specification', 'dist', 'index-min.mjs');
const mod = await import(pkgPath);

// Named exports used by fiori-mcp-server source and tests
export const {
    ACTIONTITLEPREFIX, ALPViewType, ActionType, ArtifactType,
    BINDINGPROPERTYREGEXSTRING, ChangeIndicator, ChartColor,
    CloudDevAdaptationStatus, ColorPaletteDefinitionType, ControlType,
    CreationFieldType, CustomExtensionType, CustomUIAnnotationTypes,
    DATESETTINGSPATH, DataSourceType, DefinitionName, DirName,
    DraftDiscardEnabledSettings, ExportArtifacts, FACETTITLEPREFIX,
    FIORI_FCL_ROOT_ID, FIORI_FCL_ROOT_VIEW_NAME, FRAGMENTNAMEPART,
    FacetBase, Features, FileName, FioriElementsVersion, FlexChangeLayer,
    FlexibleColumnLayoutAggregations, FlexibleColumnLayoutType,
    GENERICAPPSETTINGS, LogSeverity, MANIFESTPATH, MacrosAggregatioCardinality,
    MacrosPropertyType, ManifestSection, OdataVersion,
    PAGETYPE_VIEW_EXTENSION_TEMPLATE_MAP, PageType, PageTypeV2, PageTypeV4,
    Parser, PropertyMessageType, PropertyName, QUICKVARPATH, QUICKVARPATHX,
    RuleName, SAPUI5_FRAGMENT_CLASS, SAPUI5_VIEW_CLASS, SchemaKeyName,
    SchemaTag, SchemaType, SectionType, StatePreservationMode,
    TRANSLATION_BUNDLE_ANNOTATION, TRANSLATION_BUNDLE_APP,
    TRANSLATION_BUNDLE_SERVICE, TRANSLATION_BUNDLE_UI5,
    TableColumnVerticalAlignment, TemplatePropertyName, TemplateType,
    UIVOCABULARY, UIVOCABULARYALPHADOT, UIVOCABULARYDOT, VOCWITHCOLONS,
    VOCWITHSLASH, ViewTemplateType, ViewTypes, Visualization,
    defaultExportResult, deleteConfigEntityByPath, exportConfig,
    exportConfigEntityByPath, generateCustomExtension, generateSchema,
    getApiVersion, getChanges, getGenericSchema, getPathToGenericSchema,
    getProject, importConfig, importProject, importProjectSchema,
    isDirectory, log, logSeverityLabel, prompts, readApp, readDirectory,
    v2, v4
} = mod;

export default mod;
