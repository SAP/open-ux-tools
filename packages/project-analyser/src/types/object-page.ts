export type ObjectPageHeaderAction = 'edit' | 'save' | 'delete' | 'custom';

export interface ObjectPageHeaderToolbar {
    readonly hasBreadcrumbs: boolean;
    readonly actions: readonly ObjectPageHeaderAction[];
}

export type ObjectPageHeaderFeature = 'title' | 'subtitle' | 'content' | 'expandCollapse' | 'pin';

export interface ObjectPageHeaderContent {
    readonly features: readonly ObjectPageHeaderFeature[];
}

export type ObjectPageSectionKind = 'form' | 'table' | 'custom';

export interface ObjectPageSectionSummary {
    readonly id: string;
    readonly title?: string;
    readonly kind: ObjectPageSectionKind;
    readonly buildingBlocks?: readonly string[];
}

export interface ObjectPageFooterToolbar {
    readonly actions: readonly string[];
}

export interface ObjectPageAnalysis {
    readonly headerToolbar?: ObjectPageHeaderToolbar;
    readonly headerContent?: ObjectPageHeaderContent;
    readonly sectionCount?: number;
    readonly sections?: readonly ObjectPageSectionSummary[];
    readonly footerToolbar?: ObjectPageFooterToolbar;
}
