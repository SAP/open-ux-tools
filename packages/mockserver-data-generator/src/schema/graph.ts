export type PrimitiveType =
    'string' | 'int' | 'decimal' | 'date' | 'datetime' | 'datetimeoffset' | 'bool' | 'guid' | 'binary' | 'time';

export interface SchemaAnnotation {
    term: string;
    value?: string | number | boolean;
}

export interface SchemaProperty {
    name: string;
    primitiveType: PrimitiveType;
    nullable: boolean;
    isKey: boolean;
    maxLength?: number;
    precision?: number;
    scale?: number;
    label?: string;
    description?: string;
    dataElement?: string;
    enumValues?: ReadonlyArray<string | number | boolean>;
    annotations: ReadonlyArray<SchemaAnnotation>;
}

export interface SchemaEntity {
    name: string;
    entitySetName: string;
    properties: ReadonlyArray<SchemaProperty>;
}

export interface SchemaRelationship {
    name: string;
    fromEntitySet: string;
    toEntitySet: string;
    mappings: ReadonlyArray<Readonly<{ sourceProperty: string; targetProperty: string }>>;
}

export interface SchemaGraph {
    namespace: string;
    entities: ReadonlyArray<SchemaEntity>;
    relationships: ReadonlyArray<SchemaRelationship>;
}
