import { initI18n, t } from './i18n';
import yaml, { Document, isSeq, YAMLSeq } from 'yaml';

// From here: https://twitter.com/diegohaz/status/1309489079378219009
// Explanation here: https://dev.to/phenomnominal/i-need-to-learn-about-typescript-template-literal-types-51po
type PathImpl<T, Key extends keyof T> = Key extends string
    ? T[Key] extends Record<string, any>
        ?
              | `${Key}.${PathImpl<T[Key], Exclude<keyof T[Key], keyof any[]>> & string}`
              | `${Key}.${Exclude<keyof T[Key], keyof any[]> & string}`
        : never
    : never;

type PathImpl2<T> = PathImpl<T, keyof T> | keyof T;

export type Path<T> = PathImpl2<T> extends string | keyof T ? PathImpl2<T> : keyof T;

export interface NodeComment<T> {
    path: Path<T>;
    comment: string;
}

/**
 * Represents a yaml document with utility functions to manipulate the document.
 *
 * @class YamlDocument
 */
export class YamlDocument {
    private document: Document;

    /**
     * Returns a new instance of YamlDocument.
     *
     * @static
     * @param {string} serializedYaml - the serialized yaml string
     * @returns {YamlDocument} the YamlDocument instance
     * @memberof YamlDocument
     */
    static async newInstance(serializedYaml: string): Promise<YamlDocument> {
        await initI18n();
        return new YamlDocument(serializedYaml);
    }

    /**
     * Creates an instance of YamlDocument.
     *
     * @param {string} serializedYaml - the serialized yaml string
     * @memberof YamlDocument
     */
    private constructor(serializedYaml: string) {
        this.document = yaml.parseDocument(serializedYaml);
        if (this.document.errors?.length > 0) {
            throw new Error(t('error.yamlParsing') + '\n' + this.document.errors.map((e) => e.message).join(''));
        }
    }

    /**
     * Returns a string representation of the yaml document.
     *
     * @returns {string} the string representation
     * @memberof YamlDocument
     */
    toString(): string {
        return this.document.toString({ singleQuote: true });
    }

    /**
     * Adds a comment to the yaml document.
     *
     * @param root0 - the comment object
     * @param root0.comment - the comment object's comment
     * @param root0.location - the comment object's location
     * @returns {YamlDocument} the YamlDocument instance
     * @memberof YamlDocument
     */
    addDocumentComment({
        comment,
        location = 'beginning'
    }: {
        comment: string;
        location?: 'beginning' | 'end';
    }): YamlDocument {
        switch (location) {
            case 'beginning':
                this.document.commentBefore = comment;
                break;
            case 'end':
                this.document.comment = comment;
                break;
            default:
                break;
        }
        return this;
    }

    /**
     * Set the value at a given path.
     *
     * @param path - hierarchical path where the node will be inserted/updated
     * @param path.path - the path object's path
     * @param path.value - the path object's value
     * @param path.createIntermediateKeys - create the intermediate keys if they're missing. Error if not
     * @param path.comment - an optional comment
     * @example
     * If the document is:
     * key1:
     *   key2: value2
     *   key3:
     *     key4:
     *       - item: item1
     *       - item: item2
     *
     * To set the second item, the path will be `key1.key3.key4.1.item`
     * To set key2's value: `key1.key2`
     * To set a property at the root: 'keyX'
     * @returns {YamlDocument} the YamlDocument instance
     * @memberof YamlDocument
     */
    setIn({
        path,
        value,
        createIntermediateKeys,
        comment
    }: {
        path: string;
        value: unknown;
        createIntermediateKeys?: boolean;
        comment?: string;
    }): YamlDocument {
        const pathArray = this.toPathArray(path);

        if (pathArray.length > 1) {
            const parentPath = pathArray.slice(0, -1);
            const parentNode = this.document.getIn(parentPath);
            if (!parentNode && !createIntermediateKeys) {
                // Not at root and we're not asked to create the intermediate keys
                throw new Error(t('error.pathDoesNotExist', { path: parentPath }));
            }
        }
        const newNode = this.document.createNode(value);
        if (comment) {
            newNode.commentBefore = comment;
        }
        this.document.setIn(pathArray, newNode);

        return this;
    }
    /**
     * Appends a node to a sequence in the document.
     *
     * @param path - hierarchical path where the node will be inserted/updated
     * @param {string} path.path - the path object's path
     * @param {Object} path.value - the path object's value
     * @param {boolean} path.createIntermediateKeys - create the intermediate keys if they're missing. Error if not
     * @param path.nodeComment - optional comment to add to the node
     * @param path.comments - optional comments for subnodes in value being added
     * @returns {YamlDocument} the YamlDocument instance
     * @memberof YamlDocument
     */
    appendTo<T = unknown>({
        path,
        value,
        createIntermediateKeys = true,
        nodeComment,
        comments
    }: {
        path: string;
        value: T;
        createIntermediateKeys?: boolean;
        nodeComment?: string;
        comments?: Array<NodeComment<T>>;
    }): YamlDocument {
        const pathArray = this.toPathArray(path);
        let seq = this.document.getIn(pathArray) as YAMLSeq;
        if (!seq) {
            if (!createIntermediateKeys) {
                throw new Error(t('error.seqDoesNotExist', { path }));
            }

            seq = new YAMLSeq();
            this.document.setIn(pathArray, seq);
        } else if (!isSeq(seq)) {
            throw new Error(t('error.tryingToAppendToNonSequence', { path }));
        }
        const newNode = this.document.createNode(value);
        if (nodeComment) {
            newNode.commentBefore = nodeComment;
        }
        seq.items.push(newNode);

        if (comments && comments.length > 0) {
            if (typeof value !== 'object') {
                throw new Error(t('error.scalarValuesDoNotHaveProperties'));
            }
            const index = seq.items.length - 1;
            for (const c of comments) {
                const propPathArray = this.toPathArray(c.path);
                const n = this.document.getIn([...pathArray, index, ...propPathArray], true) as yaml.Node;
                if (!n) {
                    throw new Error(t('error.propertyNotFound', { path: c.path }));
                }
                n.comment = c.comment;
            }
        }
        return this;
    }

    /**
     * Converts to a path object to an array.
     *
     * @private
     * @template T
     * @param {Path<T>} path - the path object
     * @returns {string[]} - the path array
     * @memberof YamlDocument
     */
    private toPathArray<T>(path: Path<T>): string[] {
        const result = path
            ?.toString()
            .split('.')
            .filter((p) => p !== '');

        if (!result || result.length === 0) {
            throw new Error(t('error.pathCannotBeEmpty'));
        }

        return result;
    }
}
