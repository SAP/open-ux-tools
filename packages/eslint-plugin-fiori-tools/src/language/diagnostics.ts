import type { Manifest } from '@sap-ux/project-access';
import type { AnnotationReference } from '../project-context/parser';
export const REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE = 'sap-width-including-column-header';
export const REQUIRE_FLEX_ENABLED = 'sap-flex-enabled';
export const DISABLE_COPY_TO_CLIPBOARD = 'sap-disable-copy-to-clipboard';

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

export interface DisableCopyToClipboard {
    type: typeof DISABLE_COPY_TO_CLIPBOARD;
    manifest: ManifestPropertyDiagnosticData;
}

export type Diagnostic = RequireWidthIncludingColumnHeaderDiagnostic | RequireFlexEnabled | DisableCopyToClipboard;
