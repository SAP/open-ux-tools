import type { Diagnostic, Element, Position } from '@sap-ux/odata-annotation-core-types';
import type { VocabularyService } from '@sap-ux/odata-vocabularies';

export interface Context {
    /**
     * Record type that comes from text and is using alias.
     */
    recordType?: string;
    termType?: string;
    /**
     * Alias used in annotation group.
     */
    groupName?: string;
    valueType?: string;
    isCollection?: boolean;
    /**
     * Name of property (during parsing of it's value)
     */
    propertyName?: string;
    /**
     * In this context only annotations and $value property is allowed, everything else is ignored.
     */
    inValueContainer?: boolean;
}

/**
 * Contains current state of CDS annotation visitor
 */
export class VisitorState {
    public elementStack: Element[] = [];

    /**
     * @returns context
     */
    get context(): Context {
        const context = this._contextStack[this._contextStack.length - 1];

        if (context) {
            return context;
        }

        return {};
    }

    /**
     * Gets the depth of the context stack.
     *
     * @type {number}
     * @returns The depth of the context stack represents the number of items.
     *              currently present in the stack.
     */
    get contextDepth(): number {
        return this._contextStack.length;
    }

    /**
     * @returns array of diagnostics array.
     */
    get diagnostics(): Diagnostic[] {
        return this._diagnostics;
    }

    /**
     * Gets the set of paths stored in the instance.
     *
     * @type {Set<string>}
     * @readonly
     * @returns a set contains unique path strings.
     */
    get pathSet(): Set<string> {
        return this._pathSet;
    }
    private _contextStack: Context[] = [];
    private _diagnostics: Diagnostic[] = [];
    private _pathSet = new Set<string>();

    /**
     *
     * @param vocabularyService - The vocabulary service associated with the instance.
     * @param [position] - The optional position associated with the instance.
     */
    constructor(public vocabularyService: VocabularyService, public position?: Position) {}

    // context
    /**
     *
     * @param context context.
     */
    pushContext(context: Context) {
        this._contextStack.push(Object.seal({ ...context }));
    }
    popContext() {
        this._contextStack.splice(-1);
    }

    // collectors
    /**
     *
     * @param diagnostic - The diagnostic to be added.
     */
    addDiagnostic(diagnostic: Diagnostic) {
        this._diagnostics.push(diagnostic);
    }

    /**
     *
     * @param path - The path to be added.
     */
    addPath(path: string) {
        this._pathSet.add(path);
    }
}
