import type { Manifest } from '@sap-ux/project-access';
import type { AnnotationReference } from '../project-context/parser';
export const REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE = 'sap-width-including-column-header';
export const REQUIRE_FLEX_ENABLED = 'sap-flex-enabled';
export const CREATION_MODE_FOR_TABLE = 'sap-creation-mode-for-table';

export interface RequireWidthIncludingColumnHeaderDiagnostic {
    type: typeof REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE;
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
    requiredPropertyPath: string[];
    optionalPropertyPath: string[];
}

export interface RequireFlexEnabled {
    type: typeof REQUIRE_FLEX_ENABLED;
    manifest: ManifestPropertyDiagnosticData;
}
export type CreateModeMessageId = 'invalidCreateMode' | 'recommendCreationRows' | 'suggestAppLevel' | 'analyticalTableNotSupported';
export interface CreationModeForTable {
    type: typeof CREATION_MODE_FOR_TABLE;
    manifest: ManifestPropertyDiagnosticData;
    messageId: CreateModeMessageId;
}

export type Diagnostic = RequireWidthIncludingColumnHeaderDiagnostic | RequireFlexEnabled | CreationModeForTable;
