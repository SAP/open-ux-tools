export interface AdtSchemaData {
    service: {
        workspace: AdtWorkspace[];
    };
}

export type AdtCategoryTerm = string;
export type AdtWorkspaceTitle = string;

export interface AdtWorkspace {
    title: AdtWorkspaceTitle;
    collection: AdtCollection | AdtCollection[];
}

export interface AdtCollection {
    workspaceTitle?: AdtWorkspaceTitle;
    href: string;
    title: string;
    accept?: AdtAcceptContentType;
    category: AdtCategory;
    templateLinks: any;
    [key: string]: any;
}

export type AdtAcceptContentType = string[] | string;

export interface AdtCategory {
    term: AdtCategoryTerm;
    schema: string;
}
