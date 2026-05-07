// ESM re-export wrapper for @sap/ux-specification
// The published package is CJS, but Jest's ESM mode cannot extract named exports from CJS modules.
// This wrapper uses createRequire to load the CJS bundle and re-exports all properties as named ESM exports.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const __dirname = import.meta.dirname;
const require = createRequire(import.meta.url);
const distPath = resolve(__dirname, '..', '..', '..', 'node_modules', '@sap', 'ux-specification', 'dist', 'index-min.js');
const mod = require(distPath);

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
