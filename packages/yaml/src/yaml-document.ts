import { initI18n, t } from './i18n';
import yaml, { Document, isMap, isSeq, Node, YAMLMap, YAMLSeq } from 'yaml';

import merge = require('lodash.merge');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface NodeComment<T> {
    path: string;
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
     * Updates a node in a sequence in the document.
     *
     * @param path - hierarchical path where the node will be inserted/updated
     * @param {string} path.path - the path object's path
     * @param {Object} path.matcher - key/value pair identifying the object
     * @param {Object} path.value - the path object's value
     * @param path.matcher.key
     * @param path.matcher.value
     * @returns {YamlDocument} the YamlDocument instance
     * @memberof YamlDocument
     */
    updateAt<T = unknown>({
        path,
        matcher,
        value
    }: {
        path: string;
        matcher: { key: string; value: string };
        value: T;
    }): YamlDocument {
        const pathArray = this.toPathArray(path);
        const seq = this.document.getIn(pathArray) as YAMLSeq<yaml.Node>;
        if (!seq) {
            throw new Error(t('error.seqDoesNotExist', { path }));
        }

        const node = seq.items.find((nodeInput) => nodeInput.toJSON()[matcher.key] === matcher.value);
        const newNode = this.document.createNode(merge(node!.toJSON(), value));
        seq.items.splice(seq.items.indexOf(node!), 1, newNode);

        return this;
    }

    /**
     * Deletes a node in a sequence in the document.
     *
     * @param path - hierarchical path where the node will be deleted
     * @param {string} path.path - the path object's path
     * @param {Object} path.matcher - key/value pair identifying the object
     * @param {string} path.matcher.key - the key
     * @param {string} path.matcher.value - the value
     * @returns {YamlDocument} the YamlDocument instance
     * @memberof YamlDocument
     */
    deleteAt({ path, matcher }: { path: string; matcher: { key: string; value: string } }): YamlDocument {
        const pathArray = this.toPathArray(path);
        const seq = this.document.getIn(pathArray) as YAMLSeq<yaml.Node>;
        if (!seq || !seq.items) {
            throw new Error(t('error.seqDoesNotExist', { path }));
        }

        const deletedNode = seq.items.find((node, index) => {
            if (node.toJSON()[matcher.key] === matcher.value) {
                seq.items.splice(index, 1);
                return true;
            } else {
                return false;
            }
        });

        if (!deletedNode) {
            throw new Error(t('error.propertyNotFound', { path }));
        }

        return this;
    }

    /**
     * @param root0
     * @param root0.start
     * @param root0.path
     * @returns {unknown}
     */
    getNode({ start, path }: { start?: YAMLMap | YAMLSeq; path: string }): unknown {
        if (start) {
            if (!(isSeq(start) || isMap(start))) {
                throw new Error(t('error.startNodeMustBeCollection'));
            }
        }
        const pathArray = this.toPathArray(path);
        const node = start || this.document;
        const targetNode = node?.getIn(pathArray);
        if (!targetNode) {
            throw new Error(t('error.nodeNotFound', { path }));
        } else {
            return targetNode;
        }
    }

    /**
     * @param root0
     * @param root0.start
     * @param root0.path
     * @returns {unknown}
     */
    getSequence({ start, path }: { start?: YAMLMap | YAMLSeq; path: string }): YAMLSeq {
        const a = this.getNode({ start, path });
        if (!isSeq(a)) {
            throw new Error(t('error.seqDoesNotExist', { path }));
        } else {
            return a as YAMLSeq<Node>;
        }
    }

    /**
     * @param root0
     * @param root0.start
     * @param root0.path
     * @returns {YAMLMap}
     */
    getMap({ start, path }: { start?: YAMLMap | YAMLSeq; path: string }): YAMLMap {
        const a = this.getNode({ start, path });
        if (!isMap(a)) {
            throw new Error(t('error.nodeNotAMap', { path }));
        } else {
            return a as YAMLMap<Node>;
        }
    }

    /**
     * @param sequence
     * @param predicate
     * @returns {unknown}
     */
    findItem(sequence: YAMLSeq, predicate: (o: any) => boolean): unknown {
        const toJson = (o: unknown) =>
            (o !== undefined && typeof (o as any).toJSON === 'function' && (o as any).toJSON.call(o)) || {};

        return sequence.items.find((item) => predicate(toJson(item)));
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private toPathArray<T>(path: string): string[] {
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
