declare module 'sap/ui/dt/DesignTimeMetadata' {
    import type ManagedObject from 'sap/ui/base/ManagedObject';

    export interface DesignTimeMetadataData {
        name: string;
        ignore: boolean;
        defaultValue: unknown;
        deprecated?: boolean;
        specialIndexHandling?: boolean;
    }

    interface DesignTimeMetadata extends ManagedObject {
        getData: () => {
            properties: { [name: string]: DesignTimeMetadataData };
            aggregations: { [name: string]: DesignTimeMetadataData };
        };
    }

    export default DesignTimeMetadata;
}

declare module 'sap/ui/dt/ElementOverlay' {
    import type ManagedObject from 'sap/ui/base/ManagedObject';
    import type Overlay from 'sap/ui/dt/Overlay';

    interface ElementOverlay extends Overlay {
        getElement(): ManagedObject;
        getElementInstance(): ManagedObject;
        isSelectable(): boolean;
        setSelected(selected: boolean): void;
    }

    export default ElementOverlay;
}

declare module 'sap/ui/dt/Overlay' {
    import type Element from 'sap/ui/core/Element';
    import type DesignTimeMetadata from 'sap/ui/dt/DesignTimeMetadata';

    interface Overlay extends Element {
        getDesignTimeMetadata: () => DesignTimeMetadata;
    }

    export default Overlay;
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
    import type ElementOverlay from 'sap/ui/dt/ElementOverlay';

    export interface ContextMenuItem {
        id: string;
        text: string | ((overlay: ElementOverlay) => string);
        handler: Function;
        icon?: string;
        enabled?: Function;
    }

    interface ContextMenu {
        addMenuItem(item: ContextMenuItem);
    }

    export default ContextMenu;
}

declare module 'sap/ui/dt/Element' {
    import type Element from 'sap/ui/core/Element';

    interface ElementExtended extends Element {
        oAsyncState: any;
    }

    export default ElementExtended;
}

declare module 'sap/ui/dt/ElementUtil' {
    import type Element from 'sap/ui/core/Element';
    interface ElementUtil {
        getElementInstance(vElement: string): Element;
    }

    const ElementUtil: ElementUtil;
    export default ElementUtil;
}
