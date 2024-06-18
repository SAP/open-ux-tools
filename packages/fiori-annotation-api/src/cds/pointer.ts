import type { RecordProperty, Annotation, Assignment, AnnotationValue } from '@sap-ux/cds-annotation-parser';
import {
    ReservedProperties,
    COLLECTION_TYPE,
    ANNOTATION_GROUP_TYPE,
    ANNOTATION_TYPE,
    RECORD_TYPE
} from '@sap-ux/cds-annotation-parser';

import type { Target } from '@sap-ux/cds-odata-annotation-converter';
import { TARGET_TYPE } from '@sap-ux/cds-odata-annotation-converter';
import { rangeContained } from '@sap-ux/odata-annotation-core';
import type {
    AnnotationFile,
    ElementChild,
    Element,
    Target as AnnotationFileTarget,
    Attribute,
    Range
} from '@sap-ux/odata-annotation-core-types';
import { ELEMENT_TYPE, Edm } from '@sap-ux/odata-annotation-core-types';
import { ApiError } from '../error';

import { PRIMITIVE_TYPE_NAMES } from '../utils';

import type { CDSDocument, AstNode } from './document';

interface ReturnValue {
    pointer: string[];
}

/**
 *
 */
class Visitor {
    containsFlattenedNodes = false;
    inVocabularyGroup = false;
    currentFlattenedSegmentIndexInPath = -1;
    flattenedSegments: string[] = [];

    /**
     * Converts pointer from internal representation to CDS AST pointer.
     *
     * @param astNode - CDS document root.
     * @param node - Internal representation root.
     * @param pointer - Pointer segments.
     * @returns Converted pointer.
     */
    public document(astNode: CDSDocument, node: AnnotationFile, pointer: string[]): ReturnValue {
        const [segment, indexSegment, ...segments] = pointer;
        const index = parseInt(indexSegment, 10);
        if (!isNaN(index)) {
            if (segment === 'targets') {
                if (segments.length === 0) {
                    return {
                        pointer: [segment, indexSegment]
                    };
                }
                const result = this.target(astNode.targets[index], node.targets[index], segments);
                if (result) {
                    result.pointer = [segment, indexSegment, ...result.pointer];

                    return result;
                }
            }
        }
        return {
            pointer: []
        };
    }

    private target(astNode: Target, node: AnnotationFileTarget, pointer: string[]): ReturnValue | undefined {
        if (astNode.type === TARGET_TYPE) {
            const [segment, indexSegment, ...segments] = pointer;
            const index = parseInt(indexSegment, 10);
            const nextGenericNode = node.terms[index];
            if (segment === 'terms') {
                if (nextGenericNode?.range) {
                    const assignmentIndex = findNodeIndexByRange(astNode.assignments, nextGenericNode.range);
                    const assignment = astNode.assignments[assignmentIndex];
                    if (assignmentIndex !== -1 && assignment) {
                        const result = this.assignment(assignment, nextGenericNode, segments);
                        if (result) {
                            result.pointer = ['assignments', assignmentIndex.toString(), ...result.pointer];

                            return result;
                        }
                        if (segments.length === 0) {
                            return {
                                pointer: ['assignments', assignmentIndex.toString()]
                            };
                        }
                    }
                }
            }
        }
        return undefined;
    }

    private assignment(astNode: Assignment, node: Element, pointer: string[]): ReturnValue | undefined {
        if (astNode.type === ANNOTATION_TYPE) {
            const result = this.annotation(astNode, node, pointer);
            if (result) {
                return result;
            } else {
                return undefined;
            }
        } else if (astNode.type === ANNOTATION_GROUP_TYPE && node.range) {
            const annotationIndex = findNodeIndexByRange(astNode.items.items, node.range);
            const annotation = astNode.items.items[annotationIndex];
            this.inVocabularyGroup = true;
            const result = this.annotation(annotation, node, pointer);
            if (result) {
                result.pointer = ['items', 'items', annotationIndex.toString(), ...result.pointer];

                return result;
            } else {
                return {
                    pointer: ['items', 'items', annotationIndex.toString()]
                };
            }
        }
        return undefined;
    }

    private annotation(
        astNode: Annotation,
        node: Element,
        pointer: string[],
        embedded = false
    ): ReturnValue | undefined {
        const termSegmentLength = this.inVocabularyGroup && !embedded ? 1 : 2;
        if (astNode.term.segments.length > termSegmentLength && this.flattenedSegments.length === 0) {
            this.flattenedSegments = astNode.term.segments.slice(termSegmentLength).map((segment) => segment.value);
            this.containsFlattenedNodes = true;
            this.currentFlattenedSegmentIndexInPath = termSegmentLength - 1;
        }
        const [segment, indexSegment, ...segments] = pointer;
        const index = parseInt(indexSegment, 10);
        if (!isNaN(index) && segment === 'content' && astNode.value) {
            const annotationFileNode = node.content[index];
            if (annotationFileNode) {
                if (this.flattenedSegments.length > 0) {
                    const result = this.flattenedAnnotation(astNode, node.content[index], segments);
                    if (result) {
                        result.pointer = [...result.pointer];

                        return result;
                    }
                    return {
                        pointer: []
                    };
                } else {
                    const result = this.value(astNode.value, annotationFileNode, segments);
                    if (result) {
                        result.pointer = ['value', ...result.pointer];

                        return result;
                    }
                }

                return {
                    pointer: ['value']
                };
            }
        }

        if (segment === 'attributes' && indexSegment === Edm.Qualifier && astNode.qualifier) {
            return {
                pointer: ['qualifier']
            };
        }
        if (segment === 'attributes' && indexSegment === Edm.Term && astNode.term) {
            return {
                pointer: ['term']
            };
        }
        return undefined;
    }

    private value(
        astNode: AnnotationValue,
        node: ElementChild | Attribute,
        pointer: string[]
    ): ReturnValue | undefined {
        if (astNode.type === COLLECTION_TYPE && node.type === ELEMENT_TYPE && node.name === Edm.Collection) {
            const [segment, indexSegment, ...segments] = pointer;
            const index = parseInt(indexSegment, 10);
            if (!isNaN(index)) {
                const nextAstNode = astNode.items[index];
                if (segment === 'content' && nextAstNode) {
                    const result = this.value(nextAstNode, node.content[index], segments);
                    if (result) {
                        result.pointer = ['items', indexSegment, ...result.pointer];

                        return result;
                    }
                    return {
                        pointer: ['items', indexSegment]
                    };
                }
            } else if (pointer.length === 0) {
                return {
                    pointer: []
                };
            }
        }
        if (astNode.type === RECORD_TYPE && node.type === ELEMENT_TYPE && node.name === Edm.Record) {
            const [segment, indexSegment, ...segments] = pointer;
            const index = parseInt(indexSegment, 10);
            if (!isNaN(index)) {
                const nextGenericNode = node.content[index];

                if (segment === 'content' && nextGenericNode.type === ELEMENT_TYPE && nextGenericNode.range) {
                    const propertyIndex = findNodeIndexByRange(astNode.properties, nextGenericNode.range);
                    const property = astNode.properties[propertyIndex];
                    if (nextGenericNode.name === Edm.PropertyValue && property) {
                        const result = this.recordProperty(property, nextGenericNode, segments);
                        if (result) {
                            result.pointer = ['properties', propertyIndex.toString(), ...result.pointer];
                            return result;
                        }
                        return {
                            pointer: ['properties', propertyIndex.toString()]
                        };
                    }

                    if (nextGenericNode.name === Edm.Annotation && astNode.annotations) {
                        const annotationIndex = findNodeIndexByRange(astNode.annotations, nextGenericNode.range);
                        const annotation = astNode.annotations?.[annotationIndex];
                        if (annotation) {
                            const result = this.annotation(annotation, nextGenericNode, segments, true);
                            if (result) {
                                result.pointer = ['annotations', annotationIndex.toString(), ...result.pointer];
                                return result;
                            }
                            return {
                                pointer: ['annotations', annotationIndex.toString()]
                            };
                        }
                    }
                }
            } else if (indexSegment === Edm.Type && segment === 'attributes') {
                const recordTypePropIdx = astNode.properties.findIndex(
                    (prop) => prop.name.type === 'path' && prop.name.value === '$Type'
                );
                if (recordTypePropIdx > -1) {
                    return {
                        pointer: ['properties', recordTypePropIdx.toString(), 'value']
                    };
                }
            }
        }
        if (astNode.type === RECORD_TYPE && node.type === ELEMENT_TYPE && node.name !== Edm.Record) {
            if (node.range) {
                const valuePropertyIndex = astNode.properties.findIndex(
                    (prop) => prop.name.value === ReservedProperties.Value
                );
                const valueProperty = astNode.properties[valuePropertyIndex];

                if (valueProperty) {
                    if (node.name === Edm.Annotation && astNode.annotations) {
                        const annotationIndex = findNodeIndexByRange(astNode.annotations, node.range);
                        const annotation = astNode.annotations?.[annotationIndex];
                        if (annotation) {
                            const result = this.annotation(annotation, node, pointer, true);
                            if (result) {
                                result.pointer = ['annotations', annotationIndex.toString(), ...result.pointer];
                                return result;
                            }
                            return {
                                pointer: ['annotations', annotationIndex.toString()]
                            };
                        }
                    } else if (valueProperty.value) {
                        const result = this.value(valueProperty.value, node, pointer);
                        if (result) {
                            result.pointer = ['properties', valuePropertyIndex.toString(), 'value', ...result.pointer];
                            return result;
                        }
                        return {
                            pointer: ['properties', valuePropertyIndex.toString()]
                        };
                    }
                }
            }
        }
        if (node.type === ELEMENT_TYPE && PRIMITIVE_TYPE_NAMES.includes(node.name)) {
            return {
                pointer: []
            };
        }

        return undefined;
    }

    private recordProperty(astNode: RecordProperty, node: ElementChild, pointer: string[]): ReturnValue | undefined {
        if (node.type !== ELEMENT_TYPE || node.name !== Edm.PropertyValue) {
            return undefined;
        }
        const [segment, indexSegment, ...segments] = pointer;

        if (astNode.name.segments.length > 1 && this.flattenedSegments.length === 0) {
            this.flattenedSegments = astNode.name.segments.map((segment) => segment.value);
            this.currentFlattenedSegmentIndexInPath = 0;
            this.containsFlattenedNodes = true;
        }
        if (segment === 'attributes') {
            if (indexSegment === Edm.Property) {
                if (this.flattenedSegments.length > 0) {
                    return {
                        pointer: ['name', 'segments', this.currentFlattenedSegmentIndexInPath.toString()]
                    };
                }

                return {
                    pointer: ['name']
                };
            }
        } else if (segment === 'content') {
            const index = parseInt(indexSegment, 10);
            if (!isNaN(index) && segment === 'content' && astNode.value) {
                if (this.flattenedSegments.length > 1) {
                    const result = this.flattenedProperty(astNode, node.content[index], segments);

                    if (result) {
                        result.pointer = [...result.pointer];

                        return result;
                    }
                } else {
                    const result = this.value(astNode.value, node.content[index], segments);

                    if (result) {
                        result.pointer = ['value', ...result.pointer];

                        return result;
                    }
                }
                return {
                    pointer: ['value']
                };
            }
        }
        return undefined;
    }

    private flattenedProperty(astNode: RecordProperty, node: ElementChild, pointer: string[]): ReturnValue | undefined {
        if (node.type !== ELEMENT_TYPE || node.name !== Edm.Record) {
            return undefined;
        }
        const [segment, indexSegment, ...segments] = pointer;

        if (segment === 'content') {
            const index = parseInt(indexSegment, 10);
            if (!isNaN(index) && segment === 'content' && astNode.value) {
                this.flattenedSegments.shift();
                this.currentFlattenedSegmentIndexInPath++;
                const result =
                    this.flattenedSegments.length > 0
                        ? this.recordProperty(astNode, node.content[index], segments)
                        : this.value(astNode.value, node.content[index], segments);

                if (result) {
                    result.pointer = [...result.pointer];

                    return result;
                }
                return {
                    pointer: []
                };
            }
        } else if (segment === 'attributes' && indexSegment === Edm.Property) {
            return {
                pointer: ['name', 'segments', this.currentFlattenedSegmentIndexInPath.toString()]
            };
        }
        return undefined;
    }

    private flattenedAnnotation(astNode: Annotation, node: ElementChild, pointer: string[]): ReturnValue | undefined {
        if (node.type !== ELEMENT_TYPE || node.name !== Edm.Record) {
            return undefined;
        }
        const [segment, indexSegment, ...segments] = pointer;
        if (segment === 'content') {
            const index = parseInt(indexSegment, 10);
            if (!isNaN(index) && segment === 'content') {
                this.flattenedSegments.shift();
                this.currentFlattenedSegmentIndexInPath++;
                const propertyValue = node.content[index];
                if (segment.length === 0) {
                    return undefined;
                }
                return this.flattenedAnnotationPropertyValue(astNode, propertyValue, segments);
            }
        }
        return undefined;
    }

    private flattenedAnnotationPropertyValue(
        astNode: Annotation,
        node: ElementChild,
        pointer: string[]
    ): ReturnValue | undefined {
        if (node?.type !== ELEMENT_TYPE || node.name !== Edm.PropertyValue || !astNode.value) {
            return undefined;
        }
        const [segment, indexSegment, ...segments] = pointer;
        const index = parseInt(indexSegment, 10);
        if (!Number.isNaN(index) && segment === 'content') {
            const next = node.content[index];
            if (next?.type !== ELEMENT_TYPE) {
                return undefined;
            }

            const result =
                this.flattenedSegments.length > 0
                    ? this.flattenedAnnotation(astNode, next, segments)
                    : this.value(astNode.value, next, segments);
            if (result) {
                result.pointer = ['value', ...result.pointer];

                return result;
            }
        } else if (segment === 'attributes' && indexSegment === Edm.Property) {
            return {
                pointer: ['term', 'segments', this.currentFlattenedSegmentIndexInPath.toString()]
            };
        }
        return undefined;
    }
}

function findNodeIndexByRange<T extends { range?: Range }>(nodes: T[], range: Range): number {
    for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];
        if (!node.range) {
            continue;
        }
        if (rangeContained(node.range, range)) {
            return index;
        }
    }
    return -1;
}

/**
 * Finds a matching node to the pointer.
 *
 * @param document - CDS document root.
 * @param pointer - Pointer matching a node in the document.
 * @returns All the nodes in path to the matching node.
 */
export function getAstNodesFromPointer(document: CDSDocument, pointer: string): AstNode[] {
    const [, ...segments] = pointer.split('/');

    const path: AstNode[] = [];

    if (segments.length === 0) {
        return [];
    }

    let node: AstNode | AstNode[] | undefined = document;
    for (const segment of segments) {
        const next: AstNode[] | AstNode | undefined = (node as unknown as { [key: string]: AstNode | AstNode[] })?.[
            segment
        ];
        if (next) {
            if (!Array.isArray(next)) {
                path.push(next);
            }

            node = next;
        } else {
            // TODO: check if we should throw an error here
            return path;
        }
    }
    return path;
}

/**
 * Converts pointer from internal representation to CDS AST pointer.
 *
 * @param annotationFile - Internal representation root.
 * @param pointer - Pointer pointing to a node in the internal representation tree.
 * @param cdsDocument - Internal representation root.
 * @returns Converted pointer.
 */
export function convertPointer(
    annotationFile: AnnotationFile,
    pointer: string,
    cdsDocument: CDSDocument
): {
    pointer: string;
    containsFlattenedNodes: boolean;
} {
    const [prefix, ...segments] = pointer.split('/');
    if (prefix !== '') {
        throw new ApiError(`Invalid pointer! ${pointer} must be absolute pointer starting with "/".`);
    }
    const visitor = new Visitor();
    const result = visitor.document(cdsDocument, annotationFile, segments);
    if (result.pointer.length === 0) {
        throw new ApiError(`Could not convert pointer! ${pointer} must lead to existing node in annotation file.`);
    }
    return {
        ...result,
        pointer: ['', ...result.pointer].join('/'),
        containsFlattenedNodes: visitor.containsFlattenedNodes
    };
}
