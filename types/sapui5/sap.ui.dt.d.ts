declare module 'sap/ui/dt/DesignTimeMetadata' {
    import type ManagedObject from 'sap/ui/base/ManagedObject';

    export interface DesignTimeMetadataData {
        name: string;
        ignore: boolean;
        defaultValue: unknown;
        deprecated?: boolean;
        specialIndexHandling?: boolean;
    }

    export default interface DesignTimeMetadata extends ManagedObject {
        getData: () => {
            properties: { [name: string]: DesignTimeMetadataData };
            aggregations: { [name: string]: DesignTimeMetadataData };
        };
    }
}

declare module 'sap/ui/dt/ElementOverlay' {
    import type ManagedObject from 'sap/ui/base/ManagedObject';
    import type Overlay from 'sap/ui/dt/Overlay';

    /**
     *
     */
    export default interface ElementOverlay extends Overlay {
        getElement(): ManagedObject;
        getElementInstance(): ManagedObject;
        isSelectable(): boolean;
        /**
         *
         */
        setSelected(selected: boolean): void;
    }
}

declare module 'sap/ui/dt/Overlay' {
    import type Element from 'sap/ui/core/Element';
    import type DesignTimeMetadata from 'sap/ui/dt/DesignTimeMetadata';

    export default interface Overlay extends Element {
        getDesignTimeMetadata: () => DesignTimeMetadata;
    }
}

declare module 'sap/ui/dt/OverlayRegistry' {
    import type Element from 'sap/ui/core/Element';
    import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

    interface OverlayRegistry {
        getOverlay: (control: Element) => ElementOverlay;
    }

    const OverlayRegistry: OverlayRegistry;
    export default OverlayRegistry;
}

declare module 'sap/ui/dt/OverlayUtil' {
    import type Element from 'sap/ui/core/Element';
    import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

    interface OverlayUtil {
        getClosestOverlayFor: (control: sap.ui.core.Element) => ElementOverlay;
    }

    const OverlayUtil: OverlayUtil;
    export default OverlayUtil;
}

declare module 'sap/ui/dt/plugin/ContextMenu' {
    export interface ContextMenuItem {
        id: string;
        text: string;
        handler: Function;
        icon?: string;
    }

    /**
     *
     */
    export default interface ContextMenu {
        /**
         *
         */
        addMenuItem(item: ContextMenuItem);
    }
}
