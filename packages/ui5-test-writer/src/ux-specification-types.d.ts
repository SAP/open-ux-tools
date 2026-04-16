/**
 * Ambient module declarations for @sap/ux-specification deep imports.
 * Under NodeNext module resolution, these deep paths cannot be resolved
 * because the package lacks an "exports" map. These declarations provide
 * the type information that TypeScript needs.
 */

declare module '@sap/ux-specification/dist/types/src/parser' {
    import type { PageType } from '@sap/ux-specification/dist/types/src/common/page';
    import type { JSONSchema4 } from 'json-schema';

    export type PropertyPath = Array<string | number>;

    export interface TreeAggregations {
        [key: string]: TreeAggregation;
    }

    export interface TreeModel {
        name: string;
        pageType?: PageType;
        schema: JSONSchema4;
        root: TreeAggregation;
    }

    export interface TreeAggregation {
        path: PropertyPath;
        aggregations: TreeAggregations;
    }

    export { ApplicationModel } from '@sap/ux-specification/dist/types/src/parser/application';
}

declare module '@sap/ux-specification/dist/types/src/parser/application' {
    import type { TreeModel } from '@sap/ux-specification/dist/types/src/parser';

    interface PageBase {
        name?: string;
        entitySet?: string;
        contextPath?: string;
        navigationProperty?: string;
        config?: object;
        navigation?: { [property: string]: string | object };
        variantManagement?: string;
        pageType?: string;
    }

    export interface PageWithModelV2 extends PageBase {
        model: TreeModel;
    }

    export interface PageWithModelV4 extends PageBase {
        model: TreeModel;
    }

    export interface ApplicationModel {
        model: TreeModel;
        pages: { [key: string]: PageWithModelV2 } | { [key: string]: PageWithModelV4 };
    }
}

declare module '@sap/ux-specification/dist/types/src/common/page' {
    export enum PageTypeV2 {
        ObjectPage = 'ObjectPage',
        ListReport = 'ListReport',
        OverviewPage = 'OverviewPage',
        CustomPage = 'CustomPage',
        AnalyticalListPage = 'AnalyticalListPage'
    }

    export enum PageTypeV4 {
        ObjectPage = 'ObjectPage',
        ListReport = 'ListReport',
        CustomPage = 'CustomPage',
        FPMCustomPage = 'FPMCustomPage',
        AnalyticalListPage = 'AnalyticalListPage'
    }

    export type PageType = PageTypeV2 | PageTypeV4;
}

declare module '@sap/ux-specification/dist/types/src' {
    import type { ApplicationModel } from '@sap/ux-specification/dist/types/src/parser/application';
    import type { ApplicationAccess } from '@sap-ux/project-access';
    import type { Editor } from 'mem-fs-editor';

    export interface ReadAppResult {
        files: File[];
        version: any;
        appAccess: ApplicationAccess;
        applicationModel?: ApplicationModel;
    }

    export interface Specification {
        generateSchema: (params: any) => object;
        exportConfig: (params: any) => any;
        exportConfigEntityByPath: (params: any) => any;
        deleteConfigEntityByPath: (params: any) => any;
        importConfig: (params: any) => any;
        importProject: (params: any) => Promise<any[]>;
        getApiVersion: () => any;
        importProjectSchema: (params: any) => Promise<any[]>;
        generateCustomExtension: (params: any) => Promise<Editor | undefined>;
        readApp: (options?: any) => Promise<ReadAppResult>;
    }
}
