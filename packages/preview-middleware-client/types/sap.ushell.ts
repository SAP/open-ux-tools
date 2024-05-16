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
