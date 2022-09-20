import type { DuplexCollection, AbstractReader } from '@ui5/fs';
import type { TaskUtil } from '@ui5/builder.tasks';

export interface TaskParameters<C> {
    /**
     * DuplexCollection to read and write files
     */
    workspace: DuplexCollection;

    /**
     * Reader or Collection to read dependency files
     */
    dependencies: AbstractReader;

    /**
     * Specification Version dependent interface to a @ui5/builder.tasks.TaskUtil instance
     */
    taskUtil: TaskUtil;

    /**
     * Project specific options
     */
    options: {
        /**
         * Project name
         */
        projectName: string;

        /**
         * Project namespace if available
         */
        projectNamespace?: string;

        /**
         * Optional task configuration if provided in ui5*.yaml
         */
        configuration?: C;
    };
}
