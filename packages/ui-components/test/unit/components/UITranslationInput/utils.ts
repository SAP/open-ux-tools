import type { I18nBundle } from '../../../../src/components/UITranslationInput/UITranslationButton.types';

const defaultEntries = [
    ['dummy', 'dummy text'],
    ['Dummy'],
    ['dummy1', 'dummy1 text'],
    ['Dummy1', 'Dummy1 text'],
    ['test'],
    ['Test']
];
export const getBundle = (entries = defaultEntries): I18nBundle => {
    const bundle: I18nBundle = {};
    for (const entry of entries) {
        bundle[entry[0]] = [
            {
                key: {
                    value: entry[0]
                },
                value: {
                    value: entry[1] || entry[0]
                }
            }
        ];
    }
    return bundle;
};
