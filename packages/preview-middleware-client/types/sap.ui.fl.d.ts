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

declare module 'sap/ui/fl/Utils' {
    import type ManagedObject from 'sap/ui/base/ManagedObject';

    interface Utils {
        checkControlId(control: ManagedObject): boolean;
    }

    const Utils: Utils;
    export default Utils;
}
