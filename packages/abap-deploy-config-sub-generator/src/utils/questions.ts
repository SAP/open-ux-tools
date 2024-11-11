export function getABAPQuestions(
    fs: Editor,
    projectPath: string,
    { sapSystem, connectedSystem }: { sapSystem?: SapSystem; connectedSystem?: ConnectedSystem } = {},
    backendConfig?: BackendConfig,
    configFile = UI5_DEPLOY,
    indexGenerationAllowed = false,
    showOverwriteQuestion = false
): Promise<{ prompts: any[]; answers: Partial<AbapDeployConfigAnswers> }> {
    const { backendSystem, serviceProvider } = connectedSystem || {};
    const ui5DeployConfig = readExistingDeployTaskConfig(fs, join(projectPath, configFile));
    const {
        url,
        client = '',
        scp,
        destination
    } = getConfigProperties(sapSystem, backendSystem, ui5DeployConfig, backendConfig);
    const abapTarget = {
        url,
        client,
        scp,
        destination
    } as AbapTarget;
    const systemName = sapSystem?.name || backendSystem?.name;
    const overwriteQuestion = Boolean(showOverwriteQuestion && ui5DeployConfig); // Restrict to only apps with existing deploy config
    DeploymentGenerator.logger?.debug(
        `Retrieve ABAP prompts using: \n ProjectPath: ${projectPath} \n ABAPTarget: ${JSON.stringify(
            abapTarget
        )} \n, SystemName: ${systemName} \n ServiceProvider: ${!!serviceProvider} \n showOverwriteQuestion ${overwriteQuestion}
        )} \n indexGenerationAllowed ${indexGenerationAllowed}`
    );

    return getPrompts(
        {
            backendTarget: {
                abapTarget,
                systemName,
                serviceProvider,
                type: 'application'
            },
            ui5AbapRepo: { default: ui5DeployConfig?.app?.name },
            description: { default: ui5DeployConfig?.app?.description },
            packageManual: { default: ui5DeployConfig?.app?.package },
            transportManual: { default: ui5DeployConfig?.app?.transport },
            index: { indexGenerationAllowed },
            packageAutocomplete: { useAutocomplete: true },
            overwrite: { hide: !overwriteQuestion }
        },
        DeploymentGenerator.logger as unknown as Logger,
        getPlatform() !== PLATFORMS.CLI
    );
}
