import { MessageBarType } from '@sap-ux-private/control-property-editor-common';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import type DesignTimeMetadata from 'sap/ui/dt/DesignTimeMetadata';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type CompositeCommand from 'sap/ui/rta/command/CompositeCommand';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';
import { getError } from '../utils/error';
import { sendInfoCenterMessage } from '../utils/info-center-message';
type CommandNames = 'addXML' | 'codeExt' | 'appDescriptor';

/**
 * Class responsible for handling rta calls
 */
export default class CommandExecutor {
    /**
     *
     * @param rta Runtime Authoring
     */
    constructor(private readonly rta: RuntimeAuthoring) {}

    /**
     * Generates command based on given values
     *
     * @param runtimeControl Managed object
     * @param commandName Command name
     * @param modifiedValue Modified value/s
     * @param flexSettings Additional flex settings
     * @param designMetadata Design time metadata
     */
    public async getCommand<T>(
        runtimeControl: ManagedObject,
        commandName: CommandNames,
        modifiedValue: object,
        flexSettings: FlexSettings,
        designMetadata?: DesignTimeMetadata
    ): Promise<FlexCommand<T>> {
        try {
            return await CommandFactory.getCommandFor<FlexCommand<T>>(
                runtimeControl,
                commandName,
                modifiedValue,
                designMetadata,
                flexSettings
            );
        } catch (e) {
            const error = getError(e);
            await sendInfoCenterMessage({
                title: { key: 'ADP_GET_COMMAND_FAILURE_TITLE' },
                description: {
                    key: 'ADP_GET_COMMAND_FAILURE_DESCRIPTION',
                    params: [commandName, error.message]
                },
                type: MessageBarType.error
            });
            error.message = `Could not get command for '${commandName}'. ${error.message}`;
            throw error;
        }
    }

    /**
     * Creates composite command without nested commands
     *
     * @param runtimeControl Managed object
     */
    public async createCompositeCommand(runtimeControl: ManagedObject): Promise<CompositeCommand> {
        try {
            return await CommandFactory.getCommandFor<CompositeCommand>(runtimeControl, 'composite');
        } catch (e) {
            const error = getError(e);
            await sendInfoCenterMessage({
                title: { key: 'ADP_GET_COMMAND_FAILURE_TITLE' },
                description: {
                    key: 'ADP_GET_COMPOSITE_COMMAND_FAILURE_DESCRIPTION',
                    params: [error.message]
                },
                type: MessageBarType.error
            });
            throw error;
        }
    }

    /**
     * Pushed and executes the provided command
     *
     * @param command Command
     */
    public async pushAndExecuteCommand(command: FlexCommand | CompositeCommand): Promise<void> {
        try {
            /**
             * The change will have pending state and will only be saved to the workspace when the user clicks save icon
             */
            await this.rta.getCommandStack().pushAndExecute(command);
        } catch (e) {
            const error = getError(e);
            await sendInfoCenterMessage({
                title: { key: 'ADP_RUN_COMMAND_FAILED_TITLE' },
                description: error.message,
                type: MessageBarType.error
            });
            throw error;
        }
    }
}
