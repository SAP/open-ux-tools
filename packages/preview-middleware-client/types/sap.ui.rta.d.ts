declare module 'sap/ui/rta/command/BaseCommand' {
    import type Element from 'sap/ui/core/Element';
    import type ManagedObject from 'sap/ui/base/ManagedObject';

    interface BaseCommand extends ManagedObject {
        execute(): Promise<void>;
        getElement(): Element;
    }

    export default BaseCommand;
}

declare module 'sap/ui/rta/command/Stack' {
    import type BaseCommand from 'sap/ui/rta/command/BaseCommand';

    interface Stack {
        pushAndExecute(command: BaseCommand): Promise<void>;
        getCommands(): BaseCommand[];
        getAllExecutedCommands(): BaseCommand[];
    }

    export default Stack;
}

declare module 'sap/ui/rta/command/FlexCommand' {
    import type BaseCommand from 'sap/ui/rta/command/BaseCommand';
    import type Change from 'sap/ui/fl/Change';

    interface FlexCommand extends BaseCommand {
        getPreparedChange(): Change;
    }

    export default FlexCommand;
}

declare module 'sap/ui/rta/command/CommandFactory' {
    import type BaseCommand from 'sap/ui/rta/command/BaseCommand';
    import type DesignTimeMetadata from 'sap/ui/dt/DesignTimeMetadata';
    import type Element from 'sap/ui/core/Element';
    import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';

    interface CommandFactory {
        getCommandFor<T extends BaseCommand = BaseCommand>(
            control: Element | string,
            commandType: string,
            settings: any,
            designTimeMetadata?: DesignTimeMetadata | null,
            flexSettings?: FlexSettings
        ): Promise<T>;
    }

    const CommandFactory: CommandFactory;
    export default CommandFactory;
}

declare module 'sap/ui/rta/command/OutlineService' {
    export interface OutlineViewNode {
        id: string;
        type: 'aggregation' | 'element';
        technicalName: string;
        editable: boolean;
        elements?: OutlineViewNode[];
        visible?: boolean;
        instanceName?: string;
        name?: string;
        icon?: string;
    }

    interface OutlineService {
        get(): Promise<OutlineViewNode[]>;
        attachEvent<T>(eventName: T, handler: (params: T) => void): void;
    }

    export default OutlineService;
}

declare module 'sap/ui/rta/RuntimeAuthoring' {
    import type Event from 'sap/ui/base/Event';
    import type Component from 'sap/ui/core/Component';
    import type Stack from 'sap/ui/rta/command/Stack';
    import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
    import type ContextMenu from 'sap/ui/dt/plugin/ContextMenu';
    import type { Layer } from 'sap/ui/fl';

    type Manifest = {
        [key: string]: unknown;
        'sap.app': {
            [key: string]: string;
            id: string;
        };
    };

    export type SelectionChangeEvent = Event<SelectionChangeParams>;
    export interface SelectionChangeParams {
        selection: ElementOverlay[];
    }

    export interface FlexSettings {
        [key: string]: boolean | string;
        /**
         * The Layer in which RTA should be started.
         * @default "CUSTOMER"
         */
        layer: Layer;
        /**
         * Whether RTA is started in DeveloperMode Mode.
         * @default true
         */
        developerMode: boolean;
        /**
         * Base ID of the app
         */
        baseId: string;
        /**
         * Project ID
         */
        projectId?: string;
        /**
         * Key representing the current scenario
         */
        scenario?: Scenario;
        /**
         * Generator of the change. Will be saved in the change.
         * This value is ignored by UI5 version prior to 1.107
         */
        generator: string;
    }

    interface RuntimeAuthoring {
        attachSelectionChange(handler: (event: SelectionChangeEvent) => void): void;
        attachModeChanged: (handler: (event: Event) => void) => void;
        attachUndoRedoStackModified: (handler: (event: Event) => void) => void;
        getCommandStack: () => Stack;
        getFlexSettings: () => FlexSettings;
        getService: <T>(name: 'outline' | string) => Promise<T>;
        getSelection: () => ElementOverlay[];
        getDefaultPlugins: () => { contextMenu: ContextMenu };
        getRootControlInstance: () => {
            getManifest(): Manifest;
        } & Component;
    }

    export default RuntimeAuthoring;
}

declare module 'sap/ui/rta/api/startAdaptation' {
    import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

    export type RTAPlugin = (rta: RuntimeAuthoring) => void;
    export type StartAdaptation = (options: object, plugin?: RTAPlugin) => void;

    const startAdaptation: StartAdaptation;

    export default startAdaptation;
}
