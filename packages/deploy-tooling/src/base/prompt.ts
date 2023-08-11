import prompts from 'prompts';

/**
 * Prompt for confirmation.
 *
 * @param message - the message to be shown for confirmation.
 * @returns true if confirmed, otherwise false
 */
export async function promptConfirmation(message: string): Promise<boolean> {
    let abort: boolean = false;
    const { confirm } = await prompts(
        {
            type: 'confirm',
            name: 'confirm',
            initial: true,
            message
        },
        {
            onCancel() {
                abort = true;
                return false;
            }
        }
    );
    return confirm && !abort;
}
