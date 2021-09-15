
export interface CustomPage {
    name: string;
    entity: string;
    navigation?: {
        sourcePage?: string;
        targetEntity?: string;
    },
    view?: {
        title?: string;
        path?: string;
    }
}

export interface CustomPageConfig extends CustomPage {
    id: string;
    path: string;
}
