import ResourceBundle from 'sap/base/i18n/ResourceBundle';
import ResourceModel from 'sap/ui/model/resource/ResourceModel';

const BUNDLE_CACHE: Record<string, ResourceBundle> = {};
const MODEL_CACHE: Record<string, ResourceModel> = {};

/**
 *
 * @param key
 */
export async function getResourceBundle(key: string): Promise<ResourceBundle> {
    const cachedBundle = BUNDLE_CACHE[key];

    if (cachedBundle) {
        return cachedBundle;
    }

    const bundle = await ResourceBundle.create({
        bundleUrl: '/preview/client/messagebundle.properties',
        url: '/preview/client/messagebundle.properties',
        supportedLocales: [''],
        locale: '',
        async: true
    });
    BUNDLE_CACHE[key] = bundle;
    return bundle;
}

/**
 *
 * @param key
 */
export async function getResourceModel(key = 'open.ux.preview.client'): Promise<ResourceModel> {
    const cachedModel = MODEL_CACHE[key];

    if (cachedModel) {
        return cachedModel;
    }

    const bundle = await getResourceBundle(key);
    const model = new ResourceModel({ bundle });
    MODEL_CACHE[key] = model;
    return model;
}

/**
 *
 */
export class TextBundle {
    /**
     *
     * @param bundle
     */
    constructor(private bundle: ResourceBundle) {}

    /**
     *
     * @param key
     * @param args
     */
    getText(key: string, args?: string[]): string {
        return this.bundle.getText(key, args) ?? key;
    }
}

/**
 *
 * @param key
 */
export async function getTextBundle(key = 'open.ux.preview.client'): Promise<TextBundle> {
    const bundle = await getResourceBundle(key);
    return new TextBundle(bundle);
}
