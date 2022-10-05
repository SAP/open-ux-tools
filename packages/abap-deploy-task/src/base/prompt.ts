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

/**
 * Prompt for username and password.
 *
 * @param username - optional username that is to be offered as default
 * @returns credentials object with username/password
 */
export async function promptCredentials(username?: string) {
    const credentials = await prompts([
        {
            type: 'text',
            name: 'username',
            initial: username,
            message: 'Username:'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Password:'
        }
    ]);
    return credentials;
}
