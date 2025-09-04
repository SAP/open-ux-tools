import type { PageTypeV4 } from '@sap/ux-specification/dist/types/src';

export interface NewBasePage {
    parent?: string;
    pageType: PageTypeV4;
    navigation?: string;
    entitySet?: string;
    newEntity?: boolean;
}

export interface NewObjectPage extends NewBasePage {
    pageType: PageTypeV4.ObjectPage;
}
export interface NewListReport extends NewBasePage {
    pageType: PageTypeV4.ListReport;
}

export interface NewCustomPage extends NewBasePage {
    pageType: PageTypeV4.CustomPage;
    viewName: string;
}

export type NewPage = NewObjectPage | NewListReport | NewCustomPage;

export interface PageDef {
    pageId: string;
    pageType: string;
    entitySet: string;
    contextPath?: string;
    routePattern?: string;
    viewName?: string;
}

export interface AllowedNavigation {
    name: string;
    fullyQualifiedName?: string;
    entitySet: string;
}

export interface AllowedNavigationOptions extends AllowedNavigation {
    isNavigation?: boolean;
}

export enum MissingNavigationReason {
    NoAnyNavigationsForParent = 1,
    NotFoundNavigationForParent = 2,
    NoEntityProvided = 3,
    NotFoundEntity = 4
}

export const PAGE_VIEW_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{0,}$/i
