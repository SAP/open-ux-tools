import MessageToast from 'sap/m/MessageToast';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';
import type DesignTimeMetadata from 'sap/ui/dt/DesignTimeMetadata';
import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import { getErrorMessage } from '../cpe/error-utils';

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
    public async getCommand(
        runtimeControl: ManagedObject,
        commandName: CommandNames,
        modifiedValue: object,
        designMetadata: DesignTimeMetadata,
        flexSettings: FlexSettings
    ): Promise<FlexCommand> {
        try {
            return await CommandFactory.getCommandFor(
                runtimeControl,
                commandName,
                modifiedValue,
                designMetadata,
                flexSettings
            );
        } catch (e) {
            const errorMessage = getErrorMessage(e);
            const msgToastErrorMsg = `Could not get command for '${commandName}'. ${errorMessage}`;
            MessageToast.show(msgToastErrorMsg);
            throw new Error(msgToastErrorMsg);
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
            const errorMessage = getErrorMessage(e);
            MessageToast.show(errorMessage);
            throw new Error(errorMessage);
        }
    }
}
