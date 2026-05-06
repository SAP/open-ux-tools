import type AppComponentV4 from 'sap/fe/core/AppComponent';
export interface PageDescriptorV4 {
    appType: 'fe-v4';
    appComponent: AppComponentV4;
    pageId: string;
    routePattern?: string;
    projectId?: string;
    anchor?: string;
}

