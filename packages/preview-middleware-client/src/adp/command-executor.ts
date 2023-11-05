import MessageToast from 'sap/m/MessageToast';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import CommandFactory from 'sap/ui/rta/command/CommandFactory';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type { FlexSettings } from 'sap/ui/rta/RuntimeAuthoring';
import type DesignTimeMetadata from 'sap/ui/dt/DesignTimeMetadata';

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
     * Generates command based on given values and executes it
     *
     * @param runtimeControl Managed object
     * @param commandName Command name
     * @param modifiedValue Modified value/s
     * @param designMetadata Design time metadata
     * @param flexSettings Additional flex settings
     */
    public async generateAndExecuteCommand(
        runtimeControl: ManagedObject,
        commandName: CommandNames,
        modifiedValue: object,
        designMetadata: DesignTimeMetadata,
        flexSettings: FlexSettings
    ): Promise<void> {
        try {
            const command = await CommandFactory.getCommandFor(
                runtimeControl,
                commandName,
                modifiedValue,
                designMetadata,
                flexSettings
            );

            /**
             * The change will have pending state and will only be saved to the workspace when the user clicks save icon
             */
            await this.rta.getCommandStack().pushAndExecute(command);
        } catch (e) {
            MessageToast.show(e.message);
            throw new Error(e.message);
        }
    }
}
