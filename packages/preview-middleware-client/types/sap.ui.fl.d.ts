declare module 'sap/ui/fl' {
    export type Layer = 'USER' | 'PUBLIC' | 'CUSTOMER' | 'CUSTOMER_BASE' | 'PARTNER' | 'VENDOR' | 'BASE';
}

declare module 'sap/ui/fl/Layer' {
    const Layer = {
        CUSTOMER_BASE: 'CUSTOMER_BASE',
        VENDOR: 'VENDOR'
    } as const;

    export default Layer;
}

declare module 'sap/ui/fl/Change' {
    import type { Layer } from 'sap/ui/fl';

    export interface ChangeSelector {
        id: string;
        idIsLocal: boolean;
    }

    export interface ChangeDefinition {
        service: string;
        selector: ChangeSelector
        layer: Layer;
        changeType: string;
        packageName: string;
        support: {
            generator: string;
        };
        fileName: string;
    }
    interface Change {
        getDefinition: () => ChangeDefinition;
    }

    export default Change;
}
/**
 * Available since version `1.102` of SAPUI5 
**/
declare module 'sap/ui/fl/Scenario' {
    const scenario = {
        AppVariant: 'APP_VARIANT',
        VersionedAppVariant: 'VERSIONED_APP_VARIANT',
        AdaptationProject: 'ADAPTATION_PROJECT',
        FioriElementsFromScratch: 'FE_FROM_SCRATCH',
        UiAdaptation: 'UI_ADAPTATION'
    } as const;

    export type Scenario = (typeof scenario)[keyof typeof scenario];
    export default scenario;
}

declare module 'sap/ui/fl/Utils' {
    import type ManagedObject from 'sap/ui/base/ManagedObject';
    import type Controller from 'sap/ui/core/mvc/Controller';
    import type Control from 'sap/ui/core/Control';

    interface Utils {
        checkControlId(control: ManagedObject): boolean;
        getViewForControl(control: ManagedObject): ControlView;
        getAppComponentForControl(control: Control): Control;
    }

    interface ControlView {
        getId(): string;
        getController(): Controller;
    }

    const Utils: Utils;
    export default Utils;
}

declare module 'sap/ui/fl/write/api/connectors/ObjectStorageConnector' {
    import type { Layer } from 'sap/ui/fl';
    interface Features {
        isCondensingEnabled?: boolean;
        isContextSharingEnabled?: boolean;
        isKeyUser?: boolean;
        isProductiveSystem?: boolean;
        isVariantAdaptationEnabled?: boolean;
        isVariantSharingEnabled?: boolean;
    }

    interface Storage {
        setItem(key: string, change: unknown): Promise<unknown>;
        removeItem(key: string): Promise<unknown>;
        clear(): void;
        getItem(key: string): unknown;
        getItems(): Promise<unknown[]>;
        fileChangeRequestNotifier: ((fileName: string, kind: 'create' | 'delete', changeType?: string) => void) | undefined;
    }

    class ObjectStorageConnector {
        static layers: Layer[];
        static storage: Storage;
        static loadFeatures(): Promise<Features>;
    }

    export default ObjectStorageConnector;
}

declare module 'sap/ui/fl/write/api/ChangesWriteAPI' {
    interface ChangeHander {
        getChangeVisualizationInfo(oChange, oAppComponent): Promise<object>;
    }
    interface ChangesWriteAPI {
        getChangeHandler(mPropertyBag: object): Promise<ChangeHander>;
    }

    const ChangesWriteAPI: ChangesWriteAPI;
    export default ChangesWriteAPI;
}

declare module 'sap/ui/fl/apply/_internal/flexObjects/FlexObjectFactory' {
    interface FlexObjectFactory {
        createFromFileContent(oFileContent: object, ObjectClass?: class, bPersisted?: boolean): object;
    }

    const FlexObjectFactory: FlexObjectFactory;
    export default FlexObjectFactory;
}