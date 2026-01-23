export const TemplateType = {
    Worklist: 'worklist',
    ListReportObjectPage: 'lrop',
    AnalyticalListPage: 'alp',
    OverviewPage: 'ovp',
    FormEntryObjectPage: 'feop',
    FlexibleProgrammingModel: 'fpm'
} as const;

export type TemplateType = (typeof TemplateType)[keyof typeof TemplateType];

export const TableType = {
    GRID: 'GridTable',
    ANALYTICAL: 'AnalyticalTable',
    RESPONSIVE: 'ResponsiveTable',
    TREE: 'TreeTable'
} as const;

export type TableType = (typeof TableType)[keyof typeof TableType];

export enum OdataVersion {
    v2 = '2',
    v4 = '4'
}
