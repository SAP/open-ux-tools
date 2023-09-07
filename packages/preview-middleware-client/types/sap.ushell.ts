/*eslint-disable @typescript-eslint/no-unused-vars */
declare namespace sap.ushell {
    export class Container {
        static getServiceAsync<T = unknown>(name: string): Promise<T>;
        static attachRendererCreatedEvent(callback: Function): void;
        static createRenderer(): { placeAt(id: string): void };
    }
}

declare module 'sap/ushell/services/AppLifeCycle' {
    import UI5Event from 'sap/ui/base/Event';
    import Control from 'sap/ui/core/Control';

    interface AppLifeCycle {
        attachAppLoaded(callback: (event: UI5Event<{ componentInstance: Control }>) => void): void;
    }

    export default AppLifeCycle;
}
