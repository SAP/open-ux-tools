import type { Manifest } from '@sap-ux/project-access';
import type { AnnotationReference } from '../project-context/parser';
export const WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE = 'sap-width-including-column-header';
export const FLEX_ENABLED = 'sap-flex-enabled';
export const DISABLE_COPY_TO_CLIPBOARD = 'sap-disable-copy-to-clipboard';

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
    requiredPropertyPath: string[];
    optionalPropertyPath: string[];
}

export interface FlexEnabled {
    type: typeof FLEX_ENABLED;
    manifest: ManifestPropertyDiagnosticData;
}

export interface DisableCopyToClipboard {
    type: typeof DISABLE_COPY_TO_CLIPBOARD;
    manifest: ManifestPropertyDiagnosticData;
}

export type Diagnostic = WidthIncludingColumnHeaderDiagnostic | FlexEnabled | DisableCopyToClipboard;
