import ResourceBundle from 'sap/base/i18n/ResourceBundle';

const BUNDLE_CACHE: Record<string, ResourceBundle> = {};

export async function getResourceBundle(key = 'open.ux.preview.client'): Promise<ResourceBundle> {
    const cachedBundle = BUNDLE_CACHE[key];

    if (cachedBundle) {
        return cachedBundle;
    }

    const bundle = await ResourceBundle.create({
        bundleUrl: '/preview/client/messagebundle.properties',
        supportedLocales: [''],
        locale: '',
        async: true
    });
    BUNDLE_CACHE[key] = bundle;
    return bundle;
}
