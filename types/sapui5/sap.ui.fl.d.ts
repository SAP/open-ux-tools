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
    /**
     *
     */
    export default class {
        getDefinition: () => ChangeDefinition;
    }
}

declare module 'sap/ui/fl/Utils' {
    import type ManagedObject from 'sap/ui/base/ManagedObject';
    /**
     *
     */
    export default class {
        /**
         *
         */
        static checkControlId(control: ManagedObject): boolean;
    }
}
