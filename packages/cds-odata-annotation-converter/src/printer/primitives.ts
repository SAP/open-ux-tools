import { Edm } from '@sap-ux/odata-annotation-core';

export const PRIMITIVE_VALUE_ATTRIBUTE_NAMES: Set<string> = new Set([
    Edm.Bool,
    Edm.Decimal,
    Edm.Duration,
    Edm.Float,
    Edm.Int,
    Edm.Null,
    Edm.DateTimeOffset,
    Edm.TimeOfDay,
    Edm.Date,
    Edm.String,
    Edm.EnumMember,
    Edm.Guid,
    Edm.Binary,
    Edm.AnnotationPath,
    Edm.ModelElementPath,
    Edm.NavigationPropertyPath,
    Edm.PropertyPath,
    Edm.Path
]);

export const list = (entries: ContainerItemType[], useTrailingComma = true): string[] =>
    entries.map((entry, i, arr) => {
        const comma = i + 1 !== arr.length || useTrailingComma ? ',' : '';
        if (typeof entry === 'string') {
            return entry + comma;
        } else {
            if (entry.placeholder) {
                return entry.value;
            }
            return entry.value + comma;
        }
    });

export const container = (open: string, close: string, entries: ContainerItemType[]): string =>
    [open, ...list(entries), close].join('\n');

export interface ContainerItem {
    value: string;
    placeholder: boolean;
}

export type ContainerItemType = ContainerItem | string;

export const struct = (properties: ContainerItemType[]): string => container('{', '}', properties);

export const collection = (items: ContainerItemType[]): string => container('[', ']', items);

export const stringLiteral = (value: string): string =>
    value.indexOf('\n') !== -1 ? `\`\`\`${value}\`\`\`` : `'${value}'`;
export const delimitedIdentifier = (value: string): string => `![${value}]`;
export const valuePair = (key: string, value: string): string => `${key} : ${value}`;
export const keyAlone = (key: string): string => `${key}`;

export const CDS_NULL_EXPRESSION_LITERAL = 'null';
