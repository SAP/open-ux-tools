import type { Manifest } from '@sap-ux/project-access';
import type { AnnotationReference } from '../project-context/parser';
export const WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE = 'sap-width-including-column-header';
export const FLEX_ENABLED = 'sap-flex-enabled';
export const COPY_TO_CLIPBOARD = 'sap-copy-to-clipboard';
export const ENABLE_EXPORT = 'sap-enable-export';
export const ENABLE_PASTE = 'sap-enable-paste';
export const CREATION_MODE_FOR_TABLE = 'sap-creation-mode-for-table';
export const STATE_PRESERVATION_MODE = 'sap-state-preservation-mode';
export const TABLE_COLUMN_VERTICAL_ALIGNMENT = 'sap-table-column-vertical-alignment';

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

export interface ManifestPropertyDiagnosticData {
    uri: string;
    object: Manifest;
    propertyPath: string[];
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

export interface TableColumnVerticalAlignment {
    type: typeof TABLE_COLUMN_VERTICAL_ALIGNMENT;
    manifest: ManifestPropertyDiagnosticData;
}

export type Diagnostic =
    | WidthIncludingColumnHeaderDiagnostic
    | FlexEnabled
    | CopyToClipboard
    | CreationModeForTable
    | EnableExport
    | EnablePaste
    | StatePreservationMode
    | TableColumnVerticalAlignment;
