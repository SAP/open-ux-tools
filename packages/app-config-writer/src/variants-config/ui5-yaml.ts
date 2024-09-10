import type { UI5Config } from '@sap-ux/ui5-config';

/**
 * Adds the fiori-tools-preview middleware to the ui5.yaml file
 * @param yamlContent YAML content as JSON
 * @param yamlFile path to the YAML file
 */
async function addPreviewMiddleware(yamlContent: UI5Config, yamlFile: string): Promise<void> {
    const previewMiddlewareTemplate = {
        name: 'fiori-tools-preview',
        afterMiddleware: 'compression'
    };

    // replace null occurrences with an empty string
    yamlContent = JSON.parse(JSON.stringify(yamlContent).replace(/null/g, '""'));
    if (yamlContent.server) {
        if (yamlContent.server.customMiddleware) {
            let previewMiddleware = yamlContent.server.customMiddleware.find((middleware) => {
                return middleware.name === 'fiori-tools-preview';
            });

            const livereloadMiddleware = yamlContent.server.customMiddleware.find((middleware) => {
                return middleware.name === 'fiori-tools-appreload';
            });

            if (livereloadMiddleware) {
                previewMiddlewareTemplate.afterMiddleware = 'fiori-tools-appreload';
                livereloadMiddleware.configuration.delay = 300;
            }

            if (!previewMiddleware) {
                yamlContent.server.customMiddleware.push(previewMiddlewareTemplate);
                await promises.writeFile(yamlFile, YAML.stringify(yamlContent), { encoding: 'utf8' });
            } else {
                previewMiddleware = previewMiddlewareTemplate;
                await promises.writeFile(yamlFile, YAML.stringify(yamlContent), { encoding: 'utf8' });
            }
        } else {
            yamlContent.server.customMiddleware = [];
            yamlContent.server.customMiddleware.push(previewMiddlewareTemplate);
            await promises.writeFile(yamlFile, YAML.stringify(yamlContent), { encoding: 'utf8' });
        }
    } else {
        yamlContent.server = { customMiddleware: [] };
        yamlContent.server.customMiddleware.push(previewMiddlewareTemplate);
        await promises.writeFile(yamlFile, YAML.stringify(yamlContent), { encoding: 'utf8' });
    }
}

/**
 * Checks the project for ui5 yaml files and adds the fiori-tools-preview middleware to it
 * @param projectPath path to the project root
 * @param args arguments passed by cli
 */
export async function addPreviewMiddlewareToYaml(projectPath: string, args: string[]): Promise<void> {
    const ui5YamlFileName = getYamlFile(args);
    const ui5YamlPaths = [
        join(projectPath, ui5YamlFileName),
        join(projectPath, FileName.Ui5LocalYaml),
        join(projectPath, FileName.Ui5MockYaml)
    ];

    for (const ui5YamlPath of ui5YamlPaths) {
        if (existsSync(ui5YamlPath)) {
            const ui5Yaml = await readUi5Yaml(projectPath, FileName.UI5DeployYaml);
            await addPreviewMiddleware(ui5Yaml, ui5YamlPath);
        }
    }
}
