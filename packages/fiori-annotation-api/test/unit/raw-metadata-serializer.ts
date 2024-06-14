import { fileURLToPath } from 'url';
import { relative } from 'path';

import type {
    RawAnnotation,
    Expression,
    Collection,
    AnnotationRecord,
    RawSchema,
    RawAction,
    RawActionImport
} from '@sap-ux/vocabularies-types';
import type { Range } from 'vscode-languageserver-textdocument';

import { GHOST_FILENAME_PREFIX } from '@sap-ux/odata-annotation-core-types';

import type {
    AnnotationListWithOrigins,
    AnnotationWithOrigin,
    CollectionExpressionWithOrigins,
    RecordWithOrigins
} from '../../src/avt/annotations';

import { toUnifiedUri } from '../../src/cds/utils';
import { isAnnotation, isAnnotationList, isCollection, isRecord } from '../../src/avt';

function adaptedUrl(url: string, root: string): string {
    let result = url;
    const isGhost = url.startsWith(GHOST_FILENAME_PREFIX);
    result = isGhost ? url.slice(1) : url;
    const path = fileURLToPath(result);
    result = toUnifiedUri(relative(root, path));
    result = (isGhost ? GHOST_FILENAME_PREFIX : '') + result;
    return result;
}

export function serialize(schema: RawSchema, root: string): string {
    let result = '';
    let indent = 0;
    const annotations = schema.annotations;
    const actions = schema.actions;
    const actionImports = schema.actionImports;

    const files = Object.keys(annotations);
    for (const uri of files) {
        result += `${adaptedUrl(uri, root)}:\n`;
        indent++;
        const targets = annotations[uri];
        for (const target of targets) {
            result += `${indentToStr(indent)}${target.target} ${getLocationsText(target)}:\n`;
            result += serializeTargetAnnotations(target.annotations, indent + 1);
        }
        indent--;
    }

    result += '\nActions: ' + serializeActions(actions, indent);

    result += '\nActionImports: ' + serializeActionImports(actionImports, indent);

    return result;
}

function indentToStr(indent: number): string {
    return ' '.repeat(indent * 4);
}

function getLocationsText(
    annotationObject:
        | AnnotationListWithOrigins
        | AnnotationWithOrigin
        | RecordWithOrigins
        | CollectionExpressionWithOrigins,
    index?: number
): string {
    const getRangeText = (range: Range | undefined) =>
        range
            ? `(${range.start.line},${range.start.character})..(${range.end.line},${range.end.character})`
            : `(unknown location)`;

    if (typeof index === 'number') {
        const originsArray = getOrigins(annotationObject);
        return getRangeText(originsArray[index]);
    }
    if (isAnnotation(annotationObject) && annotationObject.origin) {
        return `${getRangeText(annotationObject.origin)}`;
    }
    if (isAnnotationList(annotationObject)) {
        const origins = annotationObject.origins ?? [];
        const texts = origins.map((range) => getRangeText(range));
        return `[${texts.join(',')}]`;
    }
    return '';
}

function getOrigins(
    annotationObject:
        | AnnotationListWithOrigins
        | AnnotationWithOrigin
        | RecordWithOrigins
        | CollectionExpressionWithOrigins
): (Range | undefined)[] {
    if (isAnnotationList(annotationObject)) {
        return annotationObject.origins ?? [];
    } else if (isAnnotation(annotationObject) || isCollection(annotationObject)) {
        return annotationObject.collectionOrigins ?? [];
    } else if (isRecord(annotationObject)) {
        return annotationObject.propertyValuesOrigins ?? [];
    }
    return [];
}

function serializeTargetAnnotations(list: RawAnnotation[], indent: number): string {
    return list.map((annotation) => serializeAnnotation(annotation, indent)).join('');
}

function serializeAnnotation(annotation: RawAnnotation, indent: number): string {
    let result = '';
    result += `${indentToStr(indent)}${annotation.term}${
        annotation.qualifier ? '#' + annotation.qualifier : ''
    } ${getLocationsText(annotation)}: `;

    if (annotation.value) {
        result += `${serializeAnnotationValueExpression(annotation.value, indent)}`;
    } else if (annotation.collection) {
        result += `(Collection) ${serializeCollection(annotation.collection, annotation, indent)}`;
    } else if (annotation.record) {
        result += `(Record) ${serializeRecord(annotation.record, indent)}`;
    } else {
        result += '(default value)';
    }

    result += serializeEmbeddedAnnotations(annotation, indent);
    result += '\n';
    return result;
}

function serializeEmbeddedAnnotations(parent: RawAnnotation | RecordWithOrigins, indent: number): string {
    let result = '';
    if (!parent.annotations || parent.annotations.length === 0) {
        return result;
    }

    result += `\n${indentToStr(indent)}[Embedded]: [\n`;
    const texts = parent.annotations.map((anno) => {
        return serializeAnnotation(anno, indent + 1);
    });
    result += `${texts.join(',\n')}${indentToStr(indent)}]`;
    return result;
}

function serializeRecord(record: RecordWithOrigins, indent: number): string {
    const props = record.propertyValues.map(
        (prop, index) =>
            `${indentToStr(indent + 1)}${prop.name} ${getLocationsText(
                record,
                index
            )}: ${serializeAnnotationValueExpression(prop.value, indent + 1)}`
    );
    const type = record.type ? `${indentToStr(indent + 1)}type: ${record.type}` : '';
    let result = `{\n${type ? type + ',\n' : ''}${props.join(',\n')}`;
    result += serializeEmbeddedAnnotations(record, indent + 1);
    result += `\n${indentToStr(indent)}}`;
    return result;
}

function isAnnotationRecord(value: any): value is AnnotationRecord {
    return Array.isArray(value.propertyValues);
}

function serializeCollection(
    collection: Collection,
    parent: AnnotationWithOrigin | CollectionExpressionWithOrigins,
    indent: number
): string {
    if (collection.length === 0) {
        return `[]`;
    } else {
        const texts = collection.map((item, index) => {
            const itemIndent = indent + 1;
            const template = `${indentToStr(itemIndent)}${index}, ${getLocationsText(parent, index)}:`;
            if (typeof item === 'string') {
                return `${template} (String) '${item}'`;
            } else if (isAnnotationRecord(item)) {
                return `${template} (Record) ${serializeRecord(item, itemIndent)}`;
            } else {
                return `${template} ${serializeAnnotationValueExpression(item, indent)}`;
            }
        });
        const lineEnding = `,\n`;
        return `[\n${texts.join(lineEnding)}\n${indentToStr(indent)}]`;
    }
}

function serializeAnnotationValueExpression(expression: Expression, indent: number): string {
    const template = `(${expression.type})`;
    const stringValue = (value: string) => `${template} '${value}'`;
    const absoluteValue = (value: string | boolean | number | null) => `${template} ${value}`;
    const jsonValue = (value: any) => `${template} ${JSON.stringify(value)}`;

    switch (expression.type) {
        case 'AnnotationPath':
        case 'NavigationPropertyPath':
        case 'Path':
        case 'PropertyPath':
            // typescript does not infer the expression types as expected
            return absoluteValue((expression as unknown as any)[expression.type]);

        case 'EnumMember':
        case 'String':
        case 'Date':
            return stringValue((expression as unknown as any)[expression.type]);

        case 'Bool':
        case 'Decimal':
        case 'Int':
        case 'Float':
        case 'Null':
        case 'Unknown':
            return absoluteValue((expression as unknown as any)[expression.type]);

        case 'And':
        case 'Eq':
        case 'Ge':
        case 'Gt':
        case 'If':
        case 'Le':
        case 'Lt':
        case 'Ne':
        case 'Not':
        case 'Or':
        case 'Apply':
            return jsonValue([expression.type]);

        case 'Record':
            return `(Record) ${serializeRecord(expression.Record, indent)}`;

        case 'Collection':
            return `(Collection) ${serializeCollection(expression.Collection, expression, indent)}`;
        default:
            return '';
    }
}

function serializeActions(actions: RawAction[], indent: number): string {
    let result = '';
    if (actions.length === 0) {
        return '[]';
    }
    const texts = actions.map((action) => serializeAction(action, indent + 1));
    result = `[\n${texts.join('\n')}\n${indentToStr(indent)}]`;
    return result;
}

function serializeAction(action: RawAction, indent: number): string {
    let result = `${indentToStr(indent)}(${action.isFunction ? 'function' : 'action'}) ${action.fullyQualifiedName}`;
    if (action.isFunction) {
        result += `: ${action.returnType}`;
    }

    if (action.parameters.length) {
        const paramIndent = indent + 1;
        const paramTexts = action.parameters.map((param, index) => {
            const paramType = `${param.isCollection ? 'Collection(' + param.type + ')' : param.type}`;
            return `${indentToStr(paramIndent)}${index}: ${param.name}: ${paramType}`;
        });
        result += `\n${paramTexts.join(',\n')}`;
    }

    return result;
}

function serializeActionImports(actionImports: RawActionImport[], indent: number): string {
    let result = '';
    if (actionImports.length === 0) {
        return '[]';
    }
    const texts = actionImports.map((actionImport) => serializeActionImport(actionImport, indent + 1));
    result = `[\n${texts.join('\n')}\n${indentToStr(indent)}]`;
    return result;
}

function serializeActionImport(actionImport: RawActionImport, indent: number): string {
    return `${indentToStr(indent)}(Action import) ${actionImport.fullyQualifiedName}(${actionImport.actionName})`;
}
