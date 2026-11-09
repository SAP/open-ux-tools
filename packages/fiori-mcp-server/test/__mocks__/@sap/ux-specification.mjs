// ESM re-export wrapper for @sap/ux-specification
// In @sap/ux-specification 1.144.13+, the package is pure ESM (no CJS bundle).
// This wrapper re-exports all named exports from the real package for Jest's ESM mode.
import { resolve } from 'node:path';
const __dirname = import.meta.dirname;
const distPath = resolve(__dirname, '..', '..', '..', 'node_modules', '@sap', 'ux-specification', 'dist', 'index-min.mjs');
const mod = await import(distPath);

// Named exports used by fiori-mcp-server source and tests
export const {
    ACTIONTITLEPREFIX, ALPViewType, ActionType, ArtifactType,
    BINDINGPROPERTYREGEXSTRING, ChangeIndicator, ChartColor,
    CloudDevAdaptationStatus, ColorPaletteDefinitionType, ControlType,
    CreationFieldType, CustomExtensionType, CustomUIAnnotationTypes,
    DATESETTINGSPATH, DataFieldActionType, DataSourceType, DefinitionName, DirName,
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
    TreeUITypeSchemaTag,
    UIVOCABULARY, UIVOCABULARYALPHADOT, UIVOCABULARYDOT, VOCWITHCOLONS,
    VOCWITHSLASH, ViewTemplateType, ViewTypes, Visualization,
    defaultExportResult, deleteConfigEntityByPath, exportConfig,
    exportConfigEntityByPath, generateBuildingBlockAggregation, generateCustomExtension, generateSchema,
    getApiVersion, getChanges, getGenericSchema, getPathToGenericSchema,
    getProject, getTableTypeOptionsByContext, importConfig, importProject, importProjectSchema,
    isDirectory, log, logSeverityLabel, prompts, readApp, readDirectory,
    v2, v4
} = mod;
