import type { Manifest } from '@sap-ux/project-access';
import type { AnnotationReference } from '../project-context/parser';
import type { Element } from '@sap-ux/odata-annotation-core';
import type { SourceLocation } from '@eslint/core';
export const WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE = 'sap-width-including-column-header';
export const ANCHOR_BAR_VISIBLE = 'sap-anchor-bar-visible';
export const FLEX_ENABLED = 'sap-flex-enabled';
export const COPY_TO_CLIPBOARD = 'sap-copy-to-clipboard';
export const ENABLE_EXPORT = 'sap-enable-export';
export const ENABLE_PASTE = 'sap-enable-paste';
export const CREATION_MODE_FOR_TABLE = 'sap-creation-mode-for-table';
export const STATE_PRESERVATION_MODE = 'sap-state-preservation-mode';
export const TABLE_PERSONALIZATION = 'sap-table-personalization';
export const TABLE_COLUMN_VERTICAL_ALIGNMENT = 'sap-table-column-vertical-alignment';
export const TEXT_ARRANGEMENT_HIDDEN = 'sap-text-arrangement-hidden';
export const NO_DATA_FIELD_INTENT_BASED_NAVIGATION = 'sap-no-data-field-intent-based-navigation';
export const CONDENSED_TABLE_LAYOUT = 'sap-condensed-table-layout';
export const STRICT_UOM_FILTERING = 'sap-strict-uom-filtering';

export interface WidthIncludingColumnHeaderDiagnostic {
    type: typeof WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE;
    manifest: ManifestPropertyDiagnosticData;
    pageName: string;
    annotation: {
        file: string;
        annotationPath: string;
        reference: AnnotationReference;
    };
}
export interface AnchorBarVisible {
    type: typeof ANCHOR_BAR_VISIBLE;
    pageName: string;
    manifest: ManifestPropertyDiagnosticData;
}
export interface ManifestPropertyDiagnosticData {
    uri: string;
    object: Manifest;
    propertyPath: string[];
    loc?: SourceLocation;
}

export interface FlexEnabled {
    type: typeof FLEX_ENABLED;
    manifest: ManifestPropertyDiagnosticData;
}
export type CreateModeMessageId =
    | 'invalidCreateMode'
    | 'recommendCreationRows'
    | 'suggestAppLevel'
    | 'analyticalTableNotSupported'
    | 'invalidCreateModeV4'
    | 'recommendInlineCreationRowsV4'
    | 'suggestAppLevelV4';
export interface CreationModeForTable {
    type: typeof CREATION_MODE_FOR_TABLE;
    pageName: string;
    manifest: ManifestPropertyDiagnosticData;
    messageId: CreateModeMessageId;
    tableType: string;
    validValues: string[];
    recommendedValue?: string;
}

export interface CopyToClipboard {
    type: typeof COPY_TO_CLIPBOARD;
    pageName: string;
    manifest: ManifestPropertyDiagnosticData;
}

export interface EnableExport {
    type: typeof ENABLE_EXPORT;
    pageName: string;
    manifest: ManifestPropertyDiagnosticData;
}

export interface EnablePaste {
    type: typeof ENABLE_PASTE;
    pageName: string;
    manifest: ManifestPropertyDiagnosticData;
}

export type StatePreservationModeMessageId =
    | 'invalidMode'
    | 'recommendPersistenceForFCL'
    | 'recommendDiscoveryForNonFCL';

export interface StatePreservationMode {
    type: typeof STATE_PRESERVATION_MODE;
    manifest: ManifestPropertyDiagnosticData;
    messageId: StatePreservationModeMessageId;
    recommendedValue?: string;
    value?: string;
}

export type PersonalizationProperty = 'column' | 'filter' | 'sort' | 'group';
export type PersonalizationMessageId =
    | 'sap-table-personalization'
    | 'sap-table-personalization-column'
    | 'sap-table-personalization-filter'
    | 'sap-table-personalization-sort'
    | 'sap-table-personalization-group'
    | 'sap-table-missing-personalization-properties';

export interface TablePersonalization {
    type: typeof TABLE_PERSONALIZATION;
    messageId: PersonalizationMessageId;
    property?: PersonalizationProperty;
    undefinedProperties?: PersonalizationProperty[];
    pageName: string;
    manifest: ManifestPropertyDiagnosticData;
}

export interface TableColumnVerticalAlignment {
    type: typeof TABLE_COLUMN_VERTICAL_ALIGNMENT;
    manifest: ManifestPropertyDiagnosticData;
}

export interface NoDataFieldIntentBasedNavigation {
    type: typeof NO_DATA_FIELD_INTENT_BASED_NAVIGATION;
    pageNames: string[];
    annotation: {
        file: string;
        recordType: string;
        annotationPath: string;
        reference: AnnotationReference;
        reportedParent: Element;
    };
}

export interface CondensedTableLayout {
    type: typeof CONDENSED_TABLE_LAYOUT;
    pageName: string;
    manifest: ManifestPropertyDiagnosticData;
}

export interface StrictUomFiltering {
    type: typeof STRICT_UOM_FILTERING;
    manifest: ManifestPropertyDiagnosticData;
}

export interface TextArrangementHidden {
    type: typeof TEXT_ARRANGEMENT_HIDDEN;
    pageNames: string[];
    annotation: {
        reference: AnnotationReference;
        textPropertyPath: string;
        targetWithTextArrangement: string;
    };
}

export type Diagnostic =
    | WidthIncludingColumnHeaderDiagnostic
    | AnchorBarVisible
    | FlexEnabled
    | CopyToClipboard
    | CreationModeForTable
    | EnableExport
    | EnablePaste
    | StatePreservationMode
    | TableColumnVerticalAlignment
    | NoDataFieldIntentBasedNavigation
    | CondensedTableLayout
    | TablePersonalization
    | TextArrangementHidden
    | StrictUomFiltering;
