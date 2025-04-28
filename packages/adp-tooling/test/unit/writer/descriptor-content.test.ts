import {
    getNewModelEnhanceWithChange,
    fillSupportData,
    getManifestContent,
    FlexLayer,
    type Content,
    type VersionDetail,
    type UI5Version
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
    const publicVersions: UI5Version = {
        latest: { version: '1.135.0' } as VersionDetail
    };

    it('should include support, minVersion and model changes for VENDOR layer with version ≥ 90', () => {
        const result = getManifestContent(FlexLayer.VENDOR, '1.134.0', publicVersions, 'F0000', 'achCode');

        expect(result).toEqual<Content[]>([
            {
                changeType: 'appdescr_fiori_setRegistrationIds',
                content: { registrationIds: ['F0000'] }
            },
            {
                changeType: 'appdescr_app_setAch',
                content: { ach: 'ACHCODE' }
            },
            {
                changeType: 'appdescr_ui5_setMinUI5Version',
                content: { minUI5Version: '1.134.0' }
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

    it('should skip support data but include minVersion & model for CUSTOMER_BASE layer', () => {
        const result = getManifestContent(FlexLayer.CUSTOMER_BASE, '1.118.0', publicVersions);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            changeType: 'appdescr_ui5_setMinUI5Version',
            content: { minUI5Version: '1.118.0' }
        });
        expect(result[1].changeType).toBe('appdescr_ui5_addNewModelEnhanceWith');
    });

    it('should skip minVersion for VENDOR layer with version < 90 ', () => {
        const result = getManifestContent(FlexLayer.VENDOR, '1.80.5', publicVersions, 'F0000', 'achCode');

        expect(result).toHaveLength(3);
        expect(result.map((c) => c.changeType)).toEqual([
            'appdescr_fiori_setRegistrationIds',
            'appdescr_app_setAch',
            'appdescr_ui5_addNewModelEnhanceWith'
        ]);
    });

    it('should use latest stable for minVersion for VENDOR layer with snapshot version ', () => {
        const result = getManifestContent(FlexLayer.VENDOR, '1.120.0-snapshot', publicVersions, 'F0000', 'achCode');

        expect(result[2]).toEqual({
            changeType: 'appdescr_ui5_setMinUI5Version',
            content: { minUI5Version: '1.135.0' }
        });
    });

    it('should skip minVersion for VENDOR layer with undefined version ', () => {
        const result = getManifestContent(FlexLayer.VENDOR, undefined, publicVersions, 'F0000', 'achCode');

        expect(result.map((c) => c.changeType)).toEqual([
            'appdescr_fiori_setRegistrationIds',
            'appdescr_app_setAch',
            'appdescr_ui5_addNewModelEnhanceWith'
        ]);
    });
});
