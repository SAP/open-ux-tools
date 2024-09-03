import ResourceBundle from 'sap/base/i18n/ResourceBundle';

const BUNDLE_CACHE: Record<string, ResourceBundle> = {};

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

export class TextBundle {
    constructor(private bundle: ResourceBundle) {}

    getText(key: string, args?: string[]): string {
        return this.bundle.getText(key, args) ?? key;
    }
}

export async function getTextBundle(key = 'open.ux.preview.client'): Promise<TextBundle> {
    const bundle = await getResourceBundle(key);
    return new TextBundle(bundle);
}
