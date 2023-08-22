import type ContextMenu from 'sap/ui/dt/plugin/ContextMenu';

export interface BaseDialog {
    init(contextMenu: ContextMenu): void;
}
