import type { FioriToolsProxyConfig, CustomMiddleware, FioriToolsPreviewConfig } from '@sap-ux/ui5-config/src/types';
import { readUi5Yaml } from '@sap-ux/project-access';
import { isAppStudio } from '@sap-ux/btp-utils';

type Properties<T extends object> = { [K in keyof T]-?: K extends string ? K : never }[keyof T];
/**
 *
 */
export default class UI5Validator {
    /**
     * Validates UI5.
     *
     * @param projectPath string
     */
    static async validateUi5Yaml(projectPath: string) {
        const ui5yaml = await readUi5Yaml(projectPath, 'ui5.yaml');
        const fioriPreview = ui5yaml.findCustomMiddleware<FioriToolsPreviewConfig>('fiori-tools-preview');
        const fioriProxy = ui5yaml.findCustomMiddleware<FioriToolsProxyConfig>('fiori-tools-proxy');

        this.checkMiddlewareProperties(fioriPreview, fioriProxy);
    }

    /**
     * Assert ui5 for its validity. Throws error if a property of middlewares is missing.
     *
     * @param properties array of property name
     * @param target object which will be checked
     */
    private static assertProperties<T extends object>(properties: Properties<T>[], target: T): void {
        for (const property of properties) {
            const value = target[property];
            if (value === null || value === undefined) {
                throw new Error(`Missing ${property} in the ui5.yaml file`);
            }
        }
    }

    /**
     * Checks if middleware has all the necessary properties an adaptation project needs.
     *
     * @param fioriPreview CustomMiddleware
     * @param fioriProxy CustomMiddleware
     */
    private static checkMiddlewareProperties(
        fioriPreview: CustomMiddleware<FioriToolsPreviewConfig> | undefined,
        fioriProxy: CustomMiddleware<FioriToolsProxyConfig> | undefined
    ): void {
        if (!fioriPreview || !fioriProxy) {
            throw new Error('Missing required custom middleware or custom configuration in ui5.yaml');
        }
        this.assertProperties(['configuration'], fioriPreview);
        this.assertProperties(['adp'], fioriPreview.configuration);
        this.assertProperties(['target'], fioriPreview.configuration.adp);
        this.assertProperties(['configuration'], fioriProxy);
        this.assertProperties(['ui5'], fioriProxy.configuration);
        this.assertProperties(['backend'], fioriProxy.configuration);
        this.assertProperties(['version', 'path', 'url'], fioriProxy.configuration.ui5!);
        if (isAppStudio()) {
            this.assertProperties(['destination'], fioriPreview.configuration.adp.target);
        } else {
            this.assertProperties(['url', 'client'], fioriPreview.configuration.adp.target);
        }
    }
}
