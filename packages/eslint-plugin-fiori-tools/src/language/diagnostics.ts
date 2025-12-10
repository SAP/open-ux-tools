import type { Element } from '@sap-ux/odata-annotation-core';
export const REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE = 'require-width-including-column-header';

export interface RequireWidthIncludingColumnHeaderDiagnostic {
    type: typeof REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE;
    manifestPropertyPath: string[];
    annotation: {
        file: string;
        annotationPath: string;
        annotation: Element;
    };
}

export type Diagnostic = RequireWidthIncludingColumnHeaderDiagnostic;
