import { getTextBundle } from '../../i18n';

export async function translateText(text: string): Promise<string> {
    const bundle = await getTextBundle();
    return bundle.getText(text);
}
