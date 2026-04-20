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

export interface ValueListService {
    type: ValueListReference['type'];
    target: string;
    entityData?: EntitySetData[];
    metadata: string;
    path: string;
}

export interface CodeListService {
    type: CodeListReference['type'];
    collectionPath?: string;
    entityData?: EntitySetData[];
    metadata: string;
    path: string;
}

export interface EntitySetData {
    /**
     * A list of objects in the entity set.
     */
    items: object[];
    entitySetName: string;
}

export type ExternalService = ValueListService | CodeListService;
