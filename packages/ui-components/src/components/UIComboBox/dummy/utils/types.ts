import { UIContextualMenuItem } from "../../../UIContextualMenu";

export interface RenamedEntries {
    [key: string]: RenamedEntry;
}

export interface RenamedEntry {
    fullValue?: string;
    displayValue?: string;
    subValue?: UIContextualMenuItem;
}

export const EDITABLE_ENTRY_PREFIX_REPLACEMENT = ['zz_'];
export const EDITABLE_ENTRY_PREFIXES = ['zz_new']; // TODO reuse PREFIX_NEW from '@sap/ux-fiori-ai-project-generator' ?

// export const EDITABLE_ENTRY_PREFIX_REPLACEMENT = ['crea'];
// export const EDITABLE_ENTRY_PREFIXES = ['name', 'created'];
