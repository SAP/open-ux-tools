export interface ValueListReference {
    type: 'value-list';
    serviceRootPath: string;
    target: string;
    value: string;
}

export interface CodeListReference {
    type: 'code-list';
    serviceRootPath: string;
    value: string;
    collectionPath?: string;
}

export type ExternalServiceReference = ValueListReference | CodeListReference;

/** Either inline metadata or metadataPath must be provided */
type MetadataSource = { metadata: string; metadataPath?: never } | { metadataPath: string; metadata?: never };

export type ValueListService = {
    type: ValueListReference['type'];
    target: string;
    entityData?: EntitySetData[];
    path: string;
} & MetadataSource;

export type CodeListService = {
    type: CodeListReference['type'];
    collectionPath?: string;
    entityData?: EntitySetData[];
    path: string;
} & MetadataSource;

export interface EntitySetData {
    /**
     * A list of objects in the entity set.
     */
    items: object[];
    entitySetName: string;
}

export type ExternalService = ValueListService | CodeListService;
