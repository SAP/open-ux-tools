
export interface CustomPage {
    navigation: {
        sourcePage: string;
        targetEntity: string;
    },
    view: {
        name?: string;
        title?: string;
        path?: string;
    }
}

export interface CustomPageConfig extends CustomPage {
    app: {
        id: string;
    }
}
