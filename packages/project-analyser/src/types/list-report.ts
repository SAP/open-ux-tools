import type { Header } from '@sap/ux-specification/dist/types/src/v4/controls/Header';
import type { FilterBar } from '@sap/ux-specification/dist/types/src/v4/controls/FilterBar';
import type {
    TableSettings,
    SelectionMode,
    TableTypeV4,
    EnableMassEdit
} from '@sap/ux-specification/dist/types/src/v4/controls/Table';

export type ListReportSelectionMode = SelectionMode;
export type ListReportTableType = TableTypeV4;
export type ListReportMassEdit = EnableMassEdit;

export interface ListReportAnalysis {
    readonly header?: Header;
    readonly filterBar?: FilterBar;
    readonly table?: TableSettings;
}
