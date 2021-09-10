import { CustomPage, CustomPageConfig } from './types';
import { Editor } from 'mem-fs-editor';

/**
 * Enhances the provided custom page configuration with default data
 *
 * @param {CustomPage} data - a custom page configuration object
 */
export function enhanceData(data: CustomPage, manifestPath: string, fs: Editor): CustomPageConfig {
    const manifest: any = fs.readJSON(manifestPath);
    const config: CustomPageConfig = {
        ...data,
        app: {
            id: manifest.app.id
        }
    };
    return config;
}
