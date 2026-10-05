import { parse } from 'comment-parser';
import type { Block, Spec } from 'comment-parser';

const TILDE = '~';

/** Minimal shape of an ESLint block comment node. */
export interface CommentNode {
    type: string;
    value: string;
    loc?: { start: { line: number }; end: { line: number } } | null;
}

export class ControllerHook {
    private doc: Block;

    /**
     * Parses a JSDoc block comment into a ControllerHook document.
     *
     * @param comment
     */
    constructor(comment: CommentNode) {
        try {
            const parsed = parse(`/*${comment.value}*/`);
            this.doc = parsed.length > 0 ? parsed[0] : { description: '', tags: [], source: [], problems: [] };
        } catch {
            this.doc = { description: '', tags: [], source: [], problems: [] };
        }
    }

    /**
     * Returns the single @callback tag from the doc, or null if absent/ambiguous.
     */
    getCallback(): Spec | null {
        const callbacks = this.doc.tags.filter((e) => e.tag === 'callback');
        if (callbacks.length !== 1) {
            return null;
        }
        return callbacks[0];
    }

    /**
     * Returns the function name portion after the last `~` separator, or null.
     */
    getCallbackName(): string | null {
        const callback = this.getCallback();
        if (!callback) {
            return null;
        }
        const parts = callback.name.split(TILDE);
        return parts[parts.length - 1];
    }

    /**
     * Returns the owner type (portion before `~`), or null if format is not `owner~name`.
     */
    getCallbackOwnerType(): string | null {
        const callback = this.getCallback();
        if (!callback) {
            return null;
        }
        const parts = callback.name.split(TILDE);
        if (parts.length !== 2) {
            return null;
        }
        return parts[0];
    }

    /**
     * Returns all @param tags from the doc.
     */
    getParameters(): Spec[] {
        return this.doc.tags.filter((e) => e.tag === 'param');
    }

    /**
     * Returns true if the doc contains exactly one @ControllerHook tag.
     */
    isControllerHook(): boolean {
        return this.doc.tags.filter((e) => e.tag === 'ControllerHook').length === 1;
    }
}
