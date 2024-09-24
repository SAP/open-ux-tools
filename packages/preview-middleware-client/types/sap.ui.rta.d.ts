declare module 'sap/ui/rta/command/BaseCommand' {
    import type Element from 'sap/ui/core/Element';
    import type ManagedObject from 'sap/ui/base/ManagedObject';
    import type Component from 'sap/ui/core/Component';

    type Selector = {
        id: string;
        name?: string;
        controlType: string;
        appComponent: Component;
    };

    interface ParentElement {
        getElement(): Element;
    }

    interface BaseCommand extends ManagedObject {
        execute(): Promise<void>;
        getElement(): Element;
        getName(): string;
        getSelector(): Selector;
        getChangeType(): string;
        getCommands(): BaseCommand[];
        getParent(): ParentElement;
    }

    export default BaseCommand;
}

declare module 'sap/ui/rta/command/Stack' {
    import type BaseCommand from 'sap/ui/rta/command/BaseCommand';

    interface Stack {
        pushAndExecute(command: BaseCommand): Promise<void>;
        getCommands(): FlexCommand[];
        getAllExecutedCommands(): FlexCommand[];
    }

    export default Stack;
}

declare module 'sap/ui/rta/command/FlexCommand' {
    import type BaseCommand from 'sap/ui/rta/command/BaseCommand';
    import type Change from 'sap/ui/fl/Change';

    interface FlexCommand<ChangeContentType = any> extends Omit<BaseCommand, 'getCommands'> {
        _oPreparedChange?: {
            _oDefinition: {
                moduleName: string;
            };
            setModuleName(moduleName: string): void;
        };
        getPreparedChange(): Change<ChangeContentType>;
        getCommands(): FlexCommand[];
    }

    export default FlexCommand;
}

declare module 'sap/ui/rta/plugin/AddXMLAtExtensionPoint' {
    import type CommandFactory from 'sap/ui/rta/command/CommandFactory';

    interface Arguments {
        commandFactory: CommandFactory;
        fragmentHandler: (overlay: UI5Element, extensionPointInfo: uknown) => Promise<void | object>;
    }

    export default class AddXMLAtExtensionPoint {
        constructor(_: Arguments) {}
    }
}

declare module 'sap/ui/rta/command/CommandFactory' {
    import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
    import type ManagedObject from 'sap/ui/base/ManagedObject';
    import type DesignTimeMetadata from 'sap/ui/dt/DesignTimeMetadata';
    import type Element from 'sap/ui/core/Element';
    import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';

    interface Arguments {
        flexSettings?: FlexSettings;
    }

    export default class CommandFactory {
        constructor(_: Arguments) {}

        static async getCommandFor<T extends FlexCommand = FlexCommand>(
            control: Element | ManagedObject | string,
            commandType: string, // type of
            settings: object,
            designTimeMetadata?: DesignTimeMetadata | null,
            flexSettings?: FlexSettings
        ): Promise<T>;
    }
}

declare module 'sap/ui/rta/command/OutlineService' {
    export type OutlineViewNode = AggregationOutlineViewNode | ExtPointOutlineViewNode | ElementOutlineViewNode;

    interface BaseOutlineViewNode {
        id: string;
        technicalName: string;
        editable: boolean;
        elements?: OutlineViewNode[];
        visible?: boolean;
        instanceName?: string;
        name?: string;
        icon?: string;
        component?: boolean;
    }

    export interface AggregationOutlineViewNode extends BaseOutlineViewNode {
        type: 'aggregation';
    }
    export interface ElementOutlineViewNode extends BaseOutlineViewNode {
        type: 'element';
    }
    export interface ExtPointOutlineViewNode extends BaseOutlineViewNode {
        type: 'extensionPoint';
        extensionPointInfo: { defaultContent: string[]; createdControls: string[] }; // only available for extension point nodes
    }

    interface OutlineService {
        get(): Promise<OutlineViewNode[]>;
        attachEvent<T>(eventName: T, handler: (params: T) => Promise<void>): void;
    }

    export default OutlineService;
}

declare module 'sap/ui/fl/FakeLrepConnector' {
    export default class FakeLrepConnector {
        static fileChangeRequestNotifier?: <T extends object>(fileName: string, kind: 'delete' | 'create', change?: T) => void;
        static enableFakeConnector: () => void;
    }
}

declare module 'sap/ui/fl/LrepConnector' {
    export default class LrepConnector {
        loadChanges(): Promise<any>;
    }
}

declare module 'sap/ui/rta/RuntimeAuthoring' {
    import type Event from 'sap/ui/base/Event';
    import type Component from 'sap/ui/core/Component';
    import type Stack from 'sap/ui/rta/command/Stack';
    import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
    import type ContextMenu from 'sap/ui/dt/plugin/ContextMenu';
    import type { Layer } from 'sap/ui/fl';
    import type { Scenario } from 'sap/ui/fl/Scenario';
    import type Control from 'sap/ui/core/Control';

    type Manifest = {
        [key: string]: unknown;
        'sap.app': {
            [key: string]: string;
            id: string;
        };
        'sap.ui5': {
            [key: string]: string;
            routing?: {
                targets?: Record<string, { name?: string }>;
            };
            flexEnabled?: boolean;
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
        scenario: Scenario;
        /**
         * Generator of the change. Will be saved in the change.
         * This value is ignored by UI5 version prior to 1.107
         */
        generator: string;
    }

    export interface RTAOptions {
        [key: string]: any;
        flexSettings: FlexSettings;
        rootControl: Control;
        validateAppVersion: boolean;
    }

    export interface FEAppPage {
        hasStyleClass(className: string): boolean;
        getContent(): {
            getComponentInstance(): Component;
        }[];
        getDomRef(): Element | null;
    }

    export default class RuntimeAuthoring {
        constructor(_: RTAOptions) {}

        destroy: () => void;
        start: () => Promise<void>;
        attachEvent: (name: string, fn: () => any) => void;
        attachSelectionChange(handler: (event: SelectionChangeEvent) => void): void;
        attachModeChanged: (handler: (event: Event) => void) => void;
        attachUndoRedoStackModified: (handler: (event: Event) => Promise<void>) => void;
        getCommandStack: () => Stack;
        getFlexSettings: () => FlexSettings;
        getService: <T>(name: 'outline' | 'controllerExtension' | string) => Promise<T>;
        getSelection: () => ElementOverlay[];
        getDefaultPlugins: () => { [key: string]: uknown; contextMenu: ContextMenu };
        setPlugins: (defaultPlugins: object) => void;
        getRootControlInstance: () => {
            getManifest(): Manifest;
            getRootControl(): {
                getPages(): FEAppPage[];
            };
        } & Component;
        stop: (bSkipSave, bSkipRestart) => Promise<void>;
        attachStop: (handler: (event: Event) => void) => void;
        setMode: (sNewMode: string) => void;
        canUndo: () => boolean;
        canRedo: () => boolean;
        canSave?: () => boolean;
        undo: () => void;
        redo: () => void;
        save?: () => Promise<void>;
        _serializeToLrep: () => Promise<void>;
    }
}

declare module 'sap/ui/rta/api/startAdaptation' {
    import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

    export type RTAPlugin = (rta: RuntimeAuthoring) => Promise<void> | void;
    export type StartAdaptation = (options: object, plugin?: RTAPlugin) => void;
    export type InitRtaScript = (options: RTAOptions, pluginScript: RTAPlugin) => Promise<void>;

    const startAdaptation: StartAdaptation;

    export default startAdaptation;
}

declare module 'sap/ui/rta/service/Action' {
    export type ActionObject = {
        /**
         * ID of the action.
         */
        id: string;
        /**
         * Group name in case the action has been grouped with other action(s).
         */
        group: string;
        /**
         * Icon name.
         */
        icon: string;
        /**
         * Indicates whether the action is active and can be executed.
         */
        enabled: boolean;
        /**
         * Sorting rank for visual representation of the action position.
         */
        rank: number;
        /**
         * Action name
         */
        text: string;
    };
    export type ActionService = {
        get: (controlId: string) => Promise<ActionObject[]>;
        get: (controlIds: string[]) => Promise<ActionObject[]>;
        execute: (controlId: string, actionId: string) => Promise<void>;
        execute: (controlIds: string[], actionId: string) => Promise<void>;
    };
}
