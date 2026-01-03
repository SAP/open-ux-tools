import type { Manifest } from '@sap-ux/project-access';
import type { AnnotationReference } from '../project-context/parser';
export const WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE = 'sap-width-including-column-header';
export const FLEX_ENABLED = 'sap-flex-enabled';
export const DISABLE_COPY_TO_CLIPBOARD = 'sap-disable-copy-to-clipboard';
export const CREATION_MODE_FOR_TABLE = 'sap-creation-mode-for-table';

export interface WidthIncludingColumnHeaderDiagnostic {
    type: typeof WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE;
    manifest: ManifestPropertyDiagnosticData;
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
    | 'analyticalTableNotSupported';
export interface CreationModeForTable {
    type: typeof CREATION_MODE_FOR_TABLE;
    manifest: ManifestPropertyDiagnosticData;
    messageId: CreateModeMessageId;
}

export interface DisableCopyToClipboard {
    type: typeof DISABLE_COPY_TO_CLIPBOARD;
    manifest: ManifestPropertyDiagnosticData;
}

export type Diagnostic =
    | WidthIncludingColumnHeaderDiagnostic
    | FlexEnabled
    | DisableCopyToClipboard
    | CreationModeForTable;
