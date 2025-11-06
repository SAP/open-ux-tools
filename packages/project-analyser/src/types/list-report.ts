export type ListReportHeaderAction = 'share' | 'sendEmail' | 'edit' | 'custom';
export type ListReportHeaderFeature = 'expandCollapse' | 'pin';

export interface ListReportHeaderAnalysis {
    readonly hasVariantManagement: boolean;
    readonly actions: readonly ListReportHeaderAction[];
    readonly features: readonly ListReportHeaderFeature[];
}

export type FilterBarMode = 'standard' | 'custom' | 'hybrid' | 'unknown';
export type FilterBarAction = 'autoLoad' | 'adaptFilters';

export interface ListReportFilterBarAnalysis {
    readonly mode: FilterBarMode;
    readonly actions: readonly FilterBarAction[];
    readonly standardFilterCount?: number;
    readonly customFilterCount?: number;
}

export type TableType = 'grid' | 'responsive' | 'tree' | 'analytical' | 'unknown';
export type SelectionMode = 'none' | 'single' | 'multi';

export interface TableToolbarActions {
    readonly standardActions: readonly string[];
    readonly customActions: readonly string[];
}

export interface TableColumnSummary {
    readonly kind: string;
    readonly isCustom: boolean;
}

export interface ListReportTableAnalysis {
    readonly type: TableType;
    readonly columnCount: number;
    readonly customColumnCount: number;
    readonly toolbar: TableToolbarActions;
    readonly massEditEnabled: boolean;
    readonly selectionMode: SelectionMode;
    readonly columns: readonly TableColumnSummary[];
}

export interface ListReportAnalysis {
    readonly header?: ListReportHeaderAnalysis;
    readonly filterBar?: ListReportFilterBarAnalysis;
    readonly table?: ListReportTableAnalysis;
}
