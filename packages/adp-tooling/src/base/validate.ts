import type {
    AdpCustomConfiguration,
    Ui5ProxyMiddlewareConfiguration,
    PreviewMiddlewareConfiguration,
    CustomMiddleware
} from '@sap-ux/ui5-config/src/types';
import { readUi5Yaml } from '@sap-ux/project-access';

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
        const adpCustomConfigurationObject = ui5yaml.getCustomConfiguration('adp');
        const adpCustomConfiguration = adpCustomConfigurationObject
            ? (adpCustomConfigurationObject as AdpCustomConfiguration)
            : undefined;
        const previewMiddleware = ui5yaml.findCustomMiddleware<PreviewMiddlewareConfiguration>('preview-middleware');
        const ui5ProxyMiddleware =
            ui5yaml.findCustomMiddleware<Ui5ProxyMiddlewareConfiguration>('ui5-proxy-middleware');

        this.checkMiddlewareProperties(adpCustomConfiguration, previewMiddleware, ui5ProxyMiddleware);
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
                throw new Error(`Missing ${property} in the ui5 yaml file`);
            }
        }
    }

    /**
     * Checks if middleware has all the necessary properties an adaptation project needs.
     *
     * @param customConfiguration AdpCustomConfiguration
     * @param previewMiddleware CustomMiddleware
     * @param ui5Middleware CustomMiddleware
     */
    private static checkMiddlewareProperties(
        customConfiguration: AdpCustomConfiguration | undefined,
        previewMiddleware: CustomMiddleware<PreviewMiddlewareConfiguration> | undefined,
        ui5Middleware: CustomMiddleware<Ui5ProxyMiddlewareConfiguration> | undefined
    ): void {
        if (!customConfiguration || !previewMiddleware || !ui5Middleware) {
            throw new Error('Missing required custom middleware or custom configuration in ui5.yaml');
        }
        this.assertProperties(['environment'], customConfiguration);
        this.assertProperties(['configuration'], previewMiddleware);
        this.assertProperties(['adp'], previewMiddleware.configuration);
        this.assertProperties(['target'], previewMiddleware.configuration.adp);
        this.assertProperties(['url', 'client'], previewMiddleware.configuration.adp.target);
        this.assertProperties(['configuration'], ui5Middleware);
        this.assertProperties(['version'], ui5Middleware.configuration);
    }
}
