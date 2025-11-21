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
    data: string;
    path: string;
}

export interface CodeListService {
    type: CodeListReference['type'];
    collectionPath?: string;
    data: string;
    path: string;
}

export type ExternalService = ValueListService | CodeListService;
