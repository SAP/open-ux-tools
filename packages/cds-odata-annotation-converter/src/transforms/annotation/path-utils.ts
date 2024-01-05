const PATH_TYPES = new Set([
    'Edm.AnnotationPath',
    'Edm.ModelElementPath',
    'Edm.NavigationPropertyPath',
    'Edm.PropertyPath',
    'Edm.AnyPropertyPath',
    'Edm.Path'
]);

/**
 *
 * @param type - The path-like type string.
 * @returns The simplified element name or undefined if the type is not recognized.
 */
export function pathLikeTypeElementName(type: string | undefined): string | undefined {
    if (type === undefined) {
        return undefined;
    } else if (PATH_TYPES.has(type)) {
        const result = type.split('.')[1];
        return result === 'AnyPropertyPath' ? 'PropertyPath' : result; // TODO distinguish from 'NavigationPropertyPath' ?
    }
    return undefined;
}

/**
 *
 * @param input escaped text.
 * @returns string without escaped characters.
 */
export function unescapeText(input: string): string {
    if (!input || typeof input !== 'string') {
        return input;
    }
    return input.replace(/''/g, "'");
}
