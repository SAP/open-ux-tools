declare namespace sap.ushell {
    import type ComponentContainer from 'sap/ui/core/ComponentContainer';

    export class Container {
        static getServiceAsync<T = unknown>(name: string): Promise<T>;
        static attachRendererCreatedEvent(callback: Function): void;
        static createRenderer(): ComponentContainer;
        static createRenderer(async: true): Promise<ComponentContainer>;
        static createRenderer(renderer?: string, async?: true): Promise<ComponentContainer>;
        static createRendererInternal(renderer?: string, async: true): Promise<ComponentContainer>;
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

declare module 'sap/ushell/services/AppState' {
    interface AppState {
        deleteAppState(appStateValue: string): void;
    }

    export default AppState;
}
