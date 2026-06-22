declare module '@ui5/fs' {
    /**
     * https://sap.github.io/ui5-tooling/stable/api/@ui5_fs_Resource.html
     */
    export class Resource {
        /**
         * Gets the resources path
         */
        getPath(): string;

        /**
         * Gets a buffer with the resource content.
         */
        getBuffer(): Promise<Buffer>;

        /**
         * Gets a string with the resource content.
         */
        getString(): Promise<string>;

        /**
         * Gets the resource name.
         */
        getName(): string;
    }

    /**
     * https://sap.github.io/ui5-tooling/stable/api/@ui5_fs_ReaderCollection.html
     */
    export class ReaderCollection {
        /**
         * Locates resources by matching glob patterns.
         */
        byGlob(virPattern: string | string[], options?: object): Promise<Resource[]>;

        /**
         * Locates resources by matching a given path.
         */
        byPath(virPattern: string | string[], options?: object): Promise<Resource>;
    }

    /**
     * https://sap.github.io/ui5-tooling/stable/api/@ui5_fs_DuplexCollection.html
     */
    export class DuplexCollection {
        /**
         *
         */
        byGlob(virPattern: string | string[], options?: object): Promise<Resource[]>;
    }

    /**
     * https://sap.github.io/ui5-tooling/stable/api/@ui5_fs_AbstractReader.html
     */
    export class AbstractReader {}
}

declare module '@ui5/builder' {
    /**
     * https://sap.github.io/ui5-tooling/stable/api/@ui5_project_build_helpers_TaskUtil.html
     */
    export class TaskUtil {}

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
}

declare module '@ui5/server' {
    export interface MiddlewareUtils {
        /**
         * Get project utilities.
         */
        getProject(): {
            /**
             * Get the full path of the project.
             */
            getRootPath(): string;

            /**
             * Get the full path of the source (webapp in case of an app) folder.
             */
            getSourcePath(): string;

            /**
             * Get the name of the project.
             */
            getName(): string;

            /**
             * Gets the app id.
             */
            getNamespace(): string;
        };
    }

    export interface MiddlewareParameters<C> {
        /**
         * DuplexCollection to read and write files
         */
        resources: {
            all: ReaderCollection;
            dependencies: ReaderCollection;
            rootProject: ReaderCollection;
        };

        /**
         * Project specific options
         */
        options: {
            /**
             * Optional middleware configuration if provided in ui5*.yaml
             */
            configuration?: C;
        };

        middlewareUtil: MiddlewareUtils;
    }
}

declare module '@ui5/project/graph' {
    /**
     * Minimal shape of the ProjectGraph returned by graphFromPackageDependencies.
     * @ui5/project ships no TypeScript types, so this is hand-rolled — extend as needed.
     * See https://sap.github.io/ui5-tooling/stable/api/@ui5_project_graph_ProjectGraph.html
     */
    export interface ProjectGraph {
        getRoot(): any;
        getProject(projectName: string): any;
        getAllProjects(): any[];
        getExtension(extensionName: string): any;
        getAllExtensions(): any[];
    }

    export interface GraphFromPackageDependenciesOptions {
        /** Directory to start searching for the root module. Defaults to process.cwd(). */
        cwd?: string;
        /** Configuration object to use for the root module instead of reading from a configuration file. */
        rootConfiguration?: object;
        /** Configuration file to use for the root module instead the default ui5.yaml. */
        rootConfigPath?: string;
        /** Framework version to use instead of the one defined in the root project. */
        versionOverride?: string;
        /** Cache mode to use when consuming SNAPSHOT versions of a framework. */
        cacheMode?: string;
        /** Whether framework dependencies should be added to the graph. Defaults to true. */
        resolveFrameworkDependencies?: boolean;
        /** Name of the workspace configuration that should be used. "default" if not provided. */
        workspaceName?: string | null;
        /** Workspace configuration object to use instead of reading from a configuration file. */
        workspaceConfiguration?: object;
        /** Workspace configuration file to use if no object has been provided. Defaults to ui5-workspace.yaml. */
        workspaceConfigPath?: string;
    }

    /**
     * Generates a ProjectGraph by resolving dependencies from package.json files
     * and configuring projects from ui5.yaml files.
     */
    export function graphFromPackageDependencies(
        options?: GraphFromPackageDependenciesOptions
    ): Promise<ProjectGraph>;
}
