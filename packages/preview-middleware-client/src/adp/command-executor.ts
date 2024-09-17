import MessageToast from 'sap/m/MessageToast';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';
import type DesignTimeMetadata from 'sap/ui/dt/DesignTimeMetadata';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { getError } from '../utils/error';

type CommandNames = 'addXML';

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
     * @param designMetadata Design time metadata
     * @param flexSettings Additional flex settings
     */
    public async getCommand<T>(
        runtimeControl: ManagedObject,
        commandName: CommandNames,
        modifiedValue: object,
        designMetadata: DesignTimeMetadata,
        flexSettings: FlexSettings
    ): Promise<FlexCommand<T>> {
        try {
            return await CommandFactory.getCommandFor(
                runtimeControl,
                commandName,
                modifiedValue,
                designMetadata,
                flexSettings
            );
        } catch (e) {
            const error = getError(e);
            const msgToastErrorMsg = `Could not get command for '${commandName}'. ${error.message}`;
            error.message = msgToastErrorMsg;
            MessageToast.show(msgToastErrorMsg);
            throw error;
        }
    }

    /**
     * Pushed and executes the provided command
     *
     * @param command Command
     */
    public async pushAndExecuteCommand(command: FlexCommand): Promise<void> {
        try {
            /**
             * The change will have pending state and will only be saved to the workspace when the user clicks save icon
             */
            await this.rta.getCommandStack().pushAndExecute(command);
        } catch (e) {
            const error = getError(e);
            MessageToast.show(error.message);
            throw error;
        }
    }
}
