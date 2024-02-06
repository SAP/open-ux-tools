import * as watchman from 'fb-watchman';
import { join } from 'path';

/**
 *
 */
export class FileWatcher {
    private client: watchman.Client;
    /**
     *
     * @param projectPath
     * @param onChange
     */
    constructor(projectPath: string, onChange: (changedFiles: string[]) => void) {
        this.client = new watchman.Client();

        // Initialize the watchman client
        this.client.command(['watch-project', projectPath], (error, resp) => {
            if (error) {
                console.error('Error initiating watch:', error);
                this.client.end();
                return;
            }

            // Subscribe to *.change file changes in the project directory
            const { watch, relative_path } = resp;
            this.client.command(
                [
                    'subscribe',
                    watch,
                    'my-subscription',
                    {
                        expression: ['allof', ['match', '*.change']],
                        fields: ['name', 'size', 'exists', 'type']
                    }
                ],
                (subscribeErr) => {
                    if (subscribeErr) {
                        console.error('Error subscribing to changes:', subscribeErr);
                        this.client.end();
                        return;
                    }
                }
            );

            // Handle file change events
            this.client.on('subscription', (resp) => {
                // Only print the file names when a file is being changed, not during initialization
                if (resp.is_fresh_instance) {
                    console.log(`Watching for TypeScript file changes in ${relative_path}...`);
                } else {
                    const changedFiles = [];
                    for (const file of resp.files) {
                        const fullPath = join(resp.root, file.name);
                        changedFiles.push(fullPath);
                    }

                    // Call the provided onChange callback with the changed file names
                    if (changedFiles.length) {
                        onChange(changedFiles);
                    }
                }
            });
        });
    }
}
