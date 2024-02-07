import type { Position, Range, Diagnostic, Element } from '@sap-ux/odata-annotation-core';

import type { VocabularyService } from '@sap-ux/odata-vocabularies';

export interface ToTermsOptions {
    record?: {
        type?: string; // check record, it type exits, it is a record. if not set?
    };
    term?: {
        type?: string;
    };
    group?: {
        name?: string;
    };
    position?: Position;
    valueType?: string;
    isCollection?: boolean;
    propName?: string; // name of property (during parsing of it's value)
    vocabularyService: VocabularyService;
    embededAnnotationsContext?: boolean;
    constraints?: {
        openPropertyTypeConstraints?: string[];
    };
}

export interface Reference {
    /**
     * Range of the reference.
     */
    range: Range;

    path: string;
}

export type VisitorReturnValue = {
    nodes: Element[];
    path: (string | number)[];
    nodeRange?: Range;
    pathSet?: Set<string>;
    references?: Reference[];
    diagnostics?: Diagnostic[];
};
