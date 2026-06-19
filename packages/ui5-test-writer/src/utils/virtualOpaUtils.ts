import type { Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import { getAllUi5YamlFileNames, readUi5Yaml, FileName } from '@sap-ux/project-access';
import type {
    TestConfig as PreviewMiddlewareTestConfig,
    MiddlewareConfig as PreviewMiddlewareConfig
} from '@sap-ux/preview-middleware';

/** Custom middleware names that may carry a virtual-test config. */
const PREVIEW_MIDDLEWARE_NAMES = ['fiori-tools-preview', 'preview-middleware'] as const;

/**
 * Returns true if any UI5 yaml file in the project has a preview middleware
 * (`fiori-tools-preview` or `preview-middleware`) whose `test` array includes an entry
 * with `framework: OPA5`.
 *
 * @param basePath - project root directory
 * @returns true when OPA5 is configured in a preview middleware, false otherwise
 */
export async function hasVirtualOPA5(basePath: string): Promise<boolean> {
    const yamlFileNames = await getAllUi5YamlFileNames(basePath);
    for (const fileName of yamlFileNames) {
        try {
            const ui5Config = await readUi5Yaml(basePath, fileName);
            const previewMiddleware = PREVIEW_MIDDLEWARE_NAMES.map((name) =>
                ui5Config.findCustomMiddleware<PreviewMiddlewareConfig>(name)
            ).find((middleware) => middleware !== undefined);
            const testEntries = previewMiddleware?.configuration?.test;
            if (testEntries?.some((entry) => entry.framework === 'OPA5')) {
                return true;
            }
        } catch {
            // Skip yaml files that cannot be read
        }
    }
    return false;
}

/**
 * Updates the fiori-tools-preview middleware in ui5-mock.yaml to support virtual OPA test endpoints.
 * Adds test framework entries to ui5-mock.yaml.
 *
 * @param basePath - the absolute target path of the application
 * @param testFrameworks - the test framework entries to add to ui5-mock.yaml
 * @param fs - the memfs editor instance
 */
export async function addVirtualTestConfig(
    basePath: string,
    testFrameworks: PreviewMiddlewareTestConfig[],
    fs: Editor
): Promise<void> {
    const yamlPath = join(basePath, FileName.Ui5MockYaml);
    if (!fs.exists(yamlPath)) {
        return;
    }
    const yamlConfig = await readUi5Yaml(basePath, FileName.Ui5MockYaml, fs);
    const previewMiddleware = yamlConfig.findCustomMiddleware<PreviewMiddlewareConfig>('fiori-tools-preview');
    if (previewMiddleware?.configuration && !previewMiddleware.configuration.test?.length) {
        previewMiddleware.configuration.test = [...testFrameworks];
        yamlConfig.updateCustomMiddleware(previewMiddleware);
        fs.write(yamlPath, yamlConfig.toString());
    }
}
