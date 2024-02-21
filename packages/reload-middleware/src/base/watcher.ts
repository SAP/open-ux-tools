import chokidar from 'chokidar';

/**
 *
 */
export class FileWatcher {
    client: chokidar.FSWatcher;

    /**
     *
     * @param projectPath
     * @param onChange
     */

    /**
     *
     * @param projectPath
     * @param onChange
     */
    constructor(projectPath: string, onChange: (changedFiles: string[]) => void) {
        const filePatterns = [
            '**/*.html',
            '**/*.js',
            '**/*.json',
            '**/*.xml',
            '**/*.properties',
            '**/*.change',
            '**/*.variant',
            '**/*.ctrl_variant',
            '**/*.ctrl_variant_change',
            '**/*.ctrl_variant_management_change'
        ];

        // Initialize the chokidar watcher
        this.client = chokidar.watch(
            filePatterns.map((pattern) => `${projectPath}/${pattern}`),
            {
                ignored: /(^|[/\\])\../, // ignore dotfiles without unnecessary escape
                persistent: true
            }
        );

        // Ready event indicates that chokidar is watching the specified paths
        this.client.on('ready', () => {
            console.log(`Watching for *.changes file changes in ${projectPath}...`);
        });

        // Add listener for file change events
        this.client.on('change', (filePath: string) => {
            console.log(`File ${filePath} has been changed`);
            onChange([filePath]); // Call the provided onChange callback with the changed file path
        });

        // Add listener for file addition events
        this.client.on('add', (filePath: string) => {
            console.log(`File ${filePath} has been added`);
            onChange([filePath]); // Call the provided onChange callback with the added file path
        });

        // Add listener for file deletion events
        this.client.on('unlink', (filePath: string) => {
            console.log(`File ${filePath} has been deleted`);
            onChange([filePath]); // Call the provided onChange callback with the deleted file path
        });

        // Error event handling
        this.client.on('error', (error: Error) => {
            console.error('Error occurred while watching files:', error);
        });
    }
}
