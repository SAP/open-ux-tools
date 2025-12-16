import type { Element } from '@sap-ux/odata-annotation-core';
export const REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE = 'sap-require-width-including-column-header';
export const REQUIRE_FLEX_ENABLED = 'sap-require-flex-enabled';

export interface RequireWidthIncludingColumnHeaderDiagnostic {
    type: typeof REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE;
    manifestPropertyPath: string[];
    propertyName: string;
    annotation: {
        file: string;
        annotationPath: string;
        annotation: Element;
    };
}

export interface ManifestPropertyDiagnostic {
    propertyPath: string[];
}

export interface RequireFlexEnabled {
    type: typeof REQUIRE_FLEX_ENABLED;
    manifestPropertyPath: string[];
    propertyName: string;
}

export type Diagnostic = RequireWidthIncludingColumnHeaderDiagnostic | RequireFlexEnabled;
