export interface DeployConfigOptions {
    baseFile?: string; // e.g ui5.yaml
    deployFile?: string; // e.g ui5-deploy.yaml
    /**
     * Default is true. If true, the build script will be added to the undeploy script
     */
    addBuildToUndeployScript?: boolean;
}
