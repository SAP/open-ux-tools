import prompts from 'prompts';

/**
 * Prompt for confirmation.
 *
 * @param message - the message to be shown for confirmation.
 * @param callback - execute a function, for example `showAppInfo()`
 * @returns true if confirmed, otherwise false
 */
export async function promptConfirmation(message: string, callback?: () => void): Promise<boolean> {
    let abort: boolean = false;

    if (callback) {
        callback();
    }

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
