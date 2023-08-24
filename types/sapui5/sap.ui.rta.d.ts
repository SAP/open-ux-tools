declare module 'sap/ui/rta/command/BaseCommand' {
    import type Element from 'sap/ui/core/Element';
    import type ManagedObject from 'sap/ui/base/ManagedObject';

    /**
     *
     */
    export default interface BaseCommand extends ManagedObject {
        execute(): Promise<void>;
        getElement(): Element;
    }
}

declare module 'sap/ui/rta/command/Stack' {
    import type BaseCommand from 'sap/ui/rta/command/BaseCommand';
    /**
     *
     */
    export default interface Stack {
        /**
         *
         */
        pushAndExecute(command: BaseCommand): Promise<void>;
        getCommands(): BaseCommand[];
        getAllExecutedCommands(): BaseCommand[];
    }
}

declare module 'sap/ui/rta/command/FlexCommand' {
    import type BaseCommand from 'sap/ui/rta/command/BaseCommand';
    import type Change from 'sap/ui/fl/Change';

    export default interface FlexCommand extends BaseCommand {
        getPreparedChange(): Change;
    }
}

declare module 'sap/ui/rta/command/CommandFactory' {
    import type BaseCommand from 'sap/ui/rta/command/BaseCommand';
    import type DesignTimeMetadata from 'sap/ui/dt/DesignTimeMetadata';
    import type Element from 'sap/ui/core/Element';
    import type { Layer } from 'sap/ui/fl';

    export interface FlexSettings {
        layer: Layer;
        developerMode: boolean;
        baseId?: string;
        projectId?: string;
        scenario?: string;
        namespace?: string;
        rootNamespace?: string;
    }

    interface CommandFactory {
        /**
         *
         */
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

    /**
     *
     */
    export default interface OutlineService {
        get(): Promise<OutlineViewNode[]>;
        /**
         *
         */
        attachEvent<T>(eventName: string, handler: (params: T) => void): void;
    }
}

declare module 'sap/ui/rta/RuntimeAuthoring' {
    import type Event from 'sap/ui/base/Event';
    import type Stack from 'sap/ui/rta/command/Stack';
    import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
    import type ContextMenu from 'sap/ui/dt/plugin/ContextMenu';

    export type SelectionChangeEvent = Event<SelectionChangeParams>;
    export interface SelectionChangeParams {
        selection: ElementOverlay[];
    }

    export default interface RuntimeAuthoring {
        attachSelectionChange(handler: (event: SelectionChangeEvent) => void): void;
        attachModeChanged: (handler: (event: Event) => void) => void;
        attachUndoRedoStackModified: (handler: (event: Event) => void) => void;
        getCommandStack: () => Stack;
        getService: <T>(name: 'outline' | string) => Promise<T>;
        getSelection: () => ElementOverlay[];
        getDefaultPlugins: () => { contextMenu: ContextMenu };
    }
}
