export interface Dependencies {
    minUI5Version?: string;
    libs?: { [key: string]: { lazy?: boolean } };
    components?: { [key: string]: { lazy?: boolean } };
}

export interface SapUi5 {
    flexEnabled?: boolean;
    resources?: object;
    dependencies?: Dependencies;
    componentUsages?: object;
    models?: { [key: string]: SapUi5OdataModel | SapUi5ResourceModel };
    extends?: {
        extensions?: SapUi5Extensions;
    };
    routing?: SapUi5Routing;
    [key: string]: string | object | boolean;
    rootView?: SapUi5RootView;
}

export interface SapUi5Extensions {
    'sap.ui.controllerExtensions'?: object;
    'sap.ui.viewExtensions'?: object;
}

export interface SapUi5ResourceModel {
    type: string;
    uri: string;
}
export interface SapUi5OdataModel {
    preload?: boolean;
    dataSource: string;
    settings?: object;
}
export interface SapUi5Routing {
    routes?: SapUi5RoutingRoute[];
    targets: SapUi5RoutingTargets;
    config?: SapUi5RoutingConfig;
}

export interface SapUi5RoutingTargets {
    [key: string]: SapUi5RoutingTarget | SapUi5RoutingTargetCustomPage;
}

export type SapUi5RoutingRouteTarget = string | string[];
export interface SapUi5RoutingRoute {
    name: string;
    pattern: string;
    target: SapUi5RoutingRouteTarget;
}

export interface SapUi5RoutingTargetBase {
    options?: {
        settings: SapUi5RoutingTargetSettings;
    };
    controlAggregation?: FlexibleColumnLayoutAggregations;
    contextPattern?: string;
}

export interface SapUi5RoutingTarget extends SapUi5RoutingTargetBase {
    type: string;
    id: string;
    name: string;
}

export interface SapUi5RoutingTargetCustomPage extends SapUi5RoutingTargetBase {
    viewId: string;
    viewName: string;
    viewLevel?: number;
    title?: string;
}

export interface SapUi5RoutingTargetNavigation {
    detail: {
        route: string;
        layout?: FlexibleColumnLayoutType;
    };
}

export interface SapUi5RoutingTargetSettingsViews {
    shownCounts?: boolean;
    paths?: { key: string; annotationPath?: string; entitySet?: string }[];
}
export interface SapUi5RoutingTargetSettings {
    entitySet?: string;
    navigation?: { [key: string]: SapUi5RoutingTargetNavigation };
    content?: {
        header?: {
            facets?: {};
        };
        body?: {
            sections?: {};
        };
    };
    variantManagement?: string;
    controlConfiguration?: object;
    views?: SapUi5RoutingTargetSettingsViews;
}

export const FIORI_FCL_ROUTER_CLASS = 'sap.f.routing.Router';
export type RouterClass = typeof FIORI_FCL_ROUTER_CLASS | string;
export interface SapUi5RoutingConfig {
    routerClass?: RouterClass;
}

export const FIORI_FCL_ROOT_VIEW_NAME = 'sap.fe.templates.RootContainer.view.Fcl';
export const FIORI_FCL_ROOT_ID = 'appRootView';
export interface SapUi5RootView {
    viewName: typeof FIORI_FCL_ROOT_VIEW_NAME | string;
    type: ViewTypes;
    id: typeof FIORI_FCL_ROOT_ID | string;
    async?: boolean;
}

export enum FlexibleColumnLayoutAggregations {
    BeginColumnPages = 'beginColumnPages',
    MidColumnPages = 'midColumnPages',
    EndColumnPages = 'endColumnPages'
}

// Values copy/pasted from 'sap/f/library' sources
export enum FlexibleColumnLayoutType {
    OneColumn = 'OneColumn',
    TwoColumnsBeginExpanded = 'TwoColumnsBeginExpanded',
    TwoColumnsMidExpanded = 'TwoColumnsMidExpanded',
    MidColumnFullScreen = 'MidColumnFullScreen',
    ThreeColumnsMidExpanded = 'ThreeColumnsMidExpanded',
    ThreeColumnsEndExpanded = 'ThreeColumnsEndExpanded',
    ThreeColumnsMidExpandedEndHidden = 'ThreeColumnsMidExpandedEndHidden',
    ThreeColumnsBeginExpandedEndHidden = 'ThreeColumnsBeginExpandedEndHidden',
    EndColumnFullScreen = 'EndColumnFullScreen'
}

export enum ViewTypes {
    XML = 'XML',
    HTML = 'HTML',
    JS = 'JS',
    JSON = 'JSON'
}
