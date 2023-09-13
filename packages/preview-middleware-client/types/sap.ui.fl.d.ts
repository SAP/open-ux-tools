declare module 'sap/ui/fl' {
    export type Layer = 'USER' | 'PUBLIC' | 'CUSTOMER' | 'CUSTOMER_BASE' | 'PARTNER' | 'VENDOR' | 'BASE';
}

declare module 'sap/ui/fl/Change' {
    export interface ChangeDefinition {
        service: string;
        changeType: string;
        packageName: string;
        support: {
            generator: string;
        };
    }
    interface Change {
        getDefinition: () => ChangeDefinition;
    }

    export default Change;
}

declare module 'sap/ui/fl/Scenario' {
    const scenario = {
        AppVariant: 'APP_VARIANT',
        VersionedAppVariant: 'VERSIONED_APP_VARIANT',
        AdaptationProject: 'ADAPTATION_PROJECT',
        FioriElementsFromScratch: 'FE_FROM_SCRATCH',
        UiAdaptation: 'UI_ADAPTATION'
    } as const;

    export type Scenario = typeof scenario[keyof typeof scenario];
    export default scenario;
}

declare module 'sap/ui/fl/Utils' {
    import type ManagedObject from 'sap/ui/base/ManagedObject';

    interface Utils {
        checkControlId(control: ManagedObject): boolean;
    }

    const Utils: Utils;
    export default Utils;
}
