import { compareByRange } from '@sap-ux/text-document-utils';

import type {
    Identifier,
    Separator,
    FlattenedAnnotationSegment,
    Path,
    FlattenedPath,
    FlattenedPropertySegment,
    FlattenedPathSegment,
    Qualifier
} from './annotation-ast-nodes';
import {
    IDENTIFIER_TYPE,
    SEPARATOR_TYPE,
    FLATTENED_PATH_TYPE,
    FLATTENED_ANNOTATION_SEGMENT_TYPE,
    FLATTENED_PROPERTY_SEGMENT_TYPE,
    QUALIFIER_TYPE
} from './annotation-ast-nodes';

type InputToken = Identifier | Separator;
/**
 * Converter from Path node to FlattenedPath node.
 */
export class FlattenedPathConverter {
    private input: InputToken[];
    private output: FlattenedPathSegment[];
    private separators: Separator[];
    private path: Path;
    private index: number;
    private supportedVocabularyAliases: Set<string>;
    private firstSegmentIsAnnotation: boolean;
    private lastSegmentQualifier: Qualifier | undefined;
    /**
     *
     * @param supportedVocabularyAliases - Supported vocabulary aliases.
     */
    constructor(supportedVocabularyAliases: Set<string>) {
        this.supportedVocabularyAliases = supportedVocabularyAliases;
    }

    /**
     * Converts Path node to FlattenedPath node.
     *
     * @param firstSegmentIsAnnotation - Indicates if the first segment is expected to be an annotation segment.
     * @param path - Path node to convert.
     * @param lastSegmentQualifier - Qualifier for the last segment, which is already parsed in CST.
     * @returns FlattenedPath node
     */
    convert(firstSegmentIsAnnotation: boolean, path: Path, lastSegmentQualifier?: Qualifier): FlattenedPath {
        this.firstSegmentIsAnnotation = firstSegmentIsAnnotation;
        this.lastSegmentQualifier = lastSegmentQualifier;
        this.path = path;
        this.reset();
        while (this.peek()) {
            const current = this.peek();
            if (!current) {
                break;
            }
            if (current.type === IDENTIFIER_TYPE) {
                this.convertIdentifier(current);
            } else if (current.type === SEPARATOR_TYPE) {
                this.separators.push(current);
            }
            this.next();
        }

        return {
            type: FLATTENED_PATH_TYPE,
            value: this.path.value,
            segments: this.output,
            separators: this.separators,
            range: this.path.range
        };
    }

    private reset(): void {
        this.input = [...this.path.segments, ...this.path.separators].sort(compareByRange);
        this.index = 0;
        this.output = [];
        this.separators = [];
    }

    /**
     * Peek a token.
     *
     * @param count Number of tokens to look ahead. By default zero token
     * @returns token or undefined
     */
    private peek(count = 0): InputToken | undefined {
        const token = this.input[this.index + count];
        if (token === undefined) {
            return undefined;
        }

        return token;
    }

    /**
     * Get next token and increment index.
     *
     * @param count number to increment index. By default one token
     * @returns Token or undefined
     */
    private next(count = 1): InputToken | undefined {
        if (this.index >= this.input.length) {
            return undefined;
        }
        this.index = this.index + count;
        return this.input[this.index];
    }

    /**
     * Converts Identifier node to FlattenedAnnotationSegment node.
     *
     * @param identifier - Identifier to convert.
     */
    private convertIdentifier(identifier: Identifier): void {
        const isFirstSegment = this.index === 0;
        const isVocabulary = this.supportedVocabularyAliases.has(identifier.value.replace('@', ''));

        const range = structuredClone(identifier.range); // this needs to be called before `convertVocabulary`, because it may consume another token
        const [vocabulary, prefix, current] = isVocabulary
            ? this.convertVocabulary(identifier)
            : [undefined, false, identifier];

        const numberSignIndex = current.value.indexOf('#');
        const [name, qualifier] = current.value.split('#');
        const term = structuredClone(current);
        term.value = name;
        if (term.range) {
            term.range.end.character = term.range.start.character + name.length;
        }

        if (range && current.range) {
            range.end = structuredClone(current.range.end);
        }

        let qualifierNode: Qualifier | undefined;
        // current index points to the term name, we need to check the token after
        const next = this.peek(1);
        if (numberSignIndex >= 0) {
            qualifierNode = {
                type: QUALIFIER_TYPE,
                value: qualifier ?? '',
                range: structuredClone(current.range)
            };

            if (qualifierNode.range) {
                qualifierNode.range.start.character += numberSignIndex + 1;
            }
        } else if (
            this.lastSegmentQualifier?.range &&
            ((next?.range && next.range.start.character > this.lastSegmentQualifier.range.end.character) ||
                next === undefined)
        ) {
            // last qualifier is parsed in CST and we need to attach it to the last flattened annotation
            qualifierNode = structuredClone(this.lastSegmentQualifier);
            qualifierNode.value = this.lastSegmentQualifier.value;
            if (range) {
                range.end.character = this.lastSegmentQualifier.range.end.character;
            }
        }

        const isAnnotationSegment =
            prefix || isVocabulary || qualifierNode !== undefined || (isFirstSegment && this.firstSegmentIsAnnotation);
        const segment: FlattenedPathSegment = isAnnotationSegment
            ? ({
                  type: FLATTENED_ANNOTATION_SEGMENT_TYPE,
                  vocabulary,
                  prefix,
                  term,
                  range,
                  qualifier: qualifierNode
              } satisfies FlattenedAnnotationSegment)
            : ({ type: FLATTENED_PROPERTY_SEGMENT_TYPE, name: term, range } satisfies FlattenedPropertySegment);

        this.output.push(segment);
    }

    /**
     * Process tokens related to vocabulary.
     *
     * @param identifier - Identifier to convert
     * @returns Tuple with vocabulary identifier, prefix flag and next identifier
     */
    private convertVocabulary(identifier: Identifier): [Identifier, boolean, Identifier] {
        let current = identifier;
        const vocabulary = structuredClone(identifier);
        let prefix = false;
        if (vocabulary.value.startsWith('@')) {
            prefix = true;
            // value should not contain @
            vocabulary.value = vocabulary.value.substring(1);
            if (vocabulary.range) {
                vocabulary.range.start.character++;
            }
        }
        let next = this.next();
        if (next?.type === SEPARATOR_TYPE) {
            // skip separator after vocabulary
            next = this.next();
        }
        if (next?.type === IDENTIFIER_TYPE) {
            current = next;
        }
        return [vocabulary, prefix, current];
    }
}
