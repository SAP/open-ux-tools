import {
    getNewModelEnhanceWithChange,
    type Content,
    fillSupportData,
    getManifestContent,
    FlexLayer
} from '../../../src';

describe('getNewModelEnhanceWithChange', () => {
    it('should return the correct model enhancement content', () => {
        const result = getNewModelEnhanceWithChange();

        expect(result).toEqual({
            changeType: 'appdescr_ui5_addNewModelEnhanceWith',
            content: {
                modelId: 'i18n',
                bundleUrl: 'i18n/i18n.properties',
                supportedLocales: [''],
                fallbackLocale: ''
            }
        });
    });
});

describe('fillSupportData', () => {
    it('should add registration ID and ACH content with correct values', () => {
        const content: Content[] = [];
        fillSupportData(content, 'F0000', 'XXX');

        expect(content).toHaveLength(2);
        expect(content[0]).toEqual({
            changeType: 'appdescr_fiori_setRegistrationIds',
            content: {
                registrationIds: ['F0000']
            }
        });
        expect(content[1]).toEqual({
            changeType: 'appdescr_app_setAch',
            content: {
                ach: 'XXX'
            }
        });
    });

    it('should handle missing FioriId and ach', () => {
        const content: Content[] = [];
        fillSupportData(content);

        expect(content[0]).toEqual({
            changeType: 'appdescr_fiori_setRegistrationIds',
            content: {
                registrationIds: [undefined]
            }
        });
        expect(content[1]).toEqual({
            changeType: 'appdescr_app_setAch',
            content: {
                ach: undefined
            }
        });
    });
});

describe('getManifestContent', () => {
    it('should include support data and model changes for non-customer layers', () => {
        const result = getManifestContent(FlexLayer.VENDOR, '1.120.0', 'F0000', 'achCode');

        expect(result).toEqual([
            {
                changeType: 'appdescr_fiori_setRegistrationIds',
                content: {
                    registrationIds: ['F0000']
                }
            },
            {
                changeType: 'appdescr_app_setAch',
                content: {
                    ach: 'ACHCODE'
                }
            },
            {
                changeType: 'appdescr_ui5_setMinUI5Version',
                content: {
                    minUI5Version: '1.120.0'
                }
            },
            {
                changeType: 'appdescr_ui5_addNewModelEnhanceWith',
                content: {
                    modelId: 'i18n',
                    bundleUrl: 'i18n/i18n.properties',
                    supportedLocales: [''],
                    fallbackLocale: ''
                }
            }
        ]);
    });

    it('should skip support data for customer base layers', () => {
        const result = getManifestContent(FlexLayer.CUSTOMER_BASE, '1.118.0');

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            changeType: 'appdescr_ui5_setMinUI5Version',
            content: {
                minUI5Version: '1.118.0'
            }
        });
        expect(result[1].changeType).toBe('appdescr_ui5_addNewModelEnhanceWith');
    });

    it('should skip minUI5Version content if version is empty', () => {
        const result = getManifestContent(FlexLayer.CUSTOMER_BASE, '');

        expect(result).toHaveLength(1);
        expect(result[0].changeType).toBe('appdescr_ui5_addNewModelEnhanceWith');
    });
});
