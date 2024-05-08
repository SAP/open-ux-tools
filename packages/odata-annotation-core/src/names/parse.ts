interface IdentifierBase {
    namespaceOrAlias?: string;
    /**
     * Simple identifier segment of the name
     */
    name: string;
}

export interface ParsedIdentifier extends IdentifierBase {
    type: 'identifier';
}

export interface ParsedCollectionIdentifier extends IdentifierBase {
    type: 'collection';
}

export interface ParsedActionFunctionSignature extends IdentifierBase {
    type: 'action-function';
    parameters: (ParsedIdentifier | ParsedCollectionIdentifier)[];
}

export type ParsedName = ParsedIdentifier | ParsedCollectionIdentifier | ParsedActionFunctionSignature;

export const COLLECTION_PREFIX = 'Collection(';
/**
 *
 * @param identifier
 * @returns
 */
export function parseIdentifier(identifier: string): ParsedName {
    // http://docs.oasis-open.org/odata/odata-csdl-xml/v4.01/odata-csdl-xml-v4.01.html#sec_IdentifierandPathValues
    // qualifiedName has the form "<SchemaNamespaceOrAlias>.<SimpleIdentifierOrPath>[(<FunctionOrActionSignature>)])"
    // SchemaNamespace and FunctionOrActionSignature can contain ".", SimpleIdentifierOrPath should not contain dots

    if (identifier.startsWith(COLLECTION_PREFIX)) {
        return parseCollection(identifier);
    }

    const parameterStartIndex = identifier.indexOf('(') + 1;

    if (parameterStartIndex > 0) {
        const functionNameIdentifier = identifier.slice(0, parameterStartIndex - 1);
        const parameterString = identifier.slice(parameterStartIndex, -1);
        const parsedIdentifier = parseInternal(functionNameIdentifier);
        const parameters =
            parameterString.length > 0
                ? parameterString
                      .split(',')
                      .map((parameter) =>
                          parameter.startsWith(COLLECTION_PREFIX)
                              ? parseCollection(parameter)
                              : parseInternal(parameter)
                      )
                : [];
        return { ...parsedIdentifier, type: 'action-function', parameters };
    }

    return parseInternal(identifier);
}

/**
 * Parses collection identifier.
 *
 * @param identifier
 * @returns parsed identifier
 */
function parseCollection(identifier: string): ParsedCollectionIdentifier {
    const substringEndIndex = identifier.endsWith(')') ? -1 : undefined;
    const parsedIdentifier = parseInternal(identifier.slice(COLLECTION_PREFIX.length, substringEndIndex));
    return { ...parsedIdentifier, type: 'collection' };
}

/**
 * Parses identifier.
 *
 * @param identifier identifier
 * @returns parsed identifier
 */
function parseInternal(identifier: string): ParsedIdentifier {
    const parts = identifier.split('.');
    if (parts.length > 1) {
        return {
            type: 'identifier',
            namespaceOrAlias: parts.slice(0, -1).join('.'),
            name: parts.splice(-1)[0]
        };
    } else {
        return {
            type: 'identifier',
            name: identifier
        };
    }
}
