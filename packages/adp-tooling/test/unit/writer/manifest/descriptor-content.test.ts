import {
    type AdpWriterConfig,
    type Content,
    ApplicationType,
    FlexLayer,
    createDescriptorChangeForResourceModel,
    fillDescriptorContent,
    getManifestContent
} from '../../../../src';

describe('createDescriptorChangeForResourceModel', () => {
    it('should return model with fallbackLocale if type is FREE_STYLE and UI5 version supports it', () => {
        const result = createDescriptorChangeForResourceModel(
            'i18n',
            'i18n/i18n.properties',
            ApplicationType.FREE_STYLE,
            '1.90.0'
        );
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

    it('should return model with only modelId and texts if feature is not supported', () => {
        const result = createDescriptorChangeForResourceModel(
            'i18n',
            'i18n/i18n.properties',
            ApplicationType.FIORI_ELEMENTS,
            '1.70.0'
        );
        expect(result).toEqual({
            changeType: 'appdescr_ui5_addNewModelEnhanceWith',
            content: { modelId: 'i18n' },
            texts: { i18n: 'i18n/i18n.properties' }
        });
    });
});

describe('fillDescriptorContent', () => {
    it('should add descriptor content for each i18n model', () => {
        const content: Content[] = [];
        const models = [
            { key: 'model1', path: 'path1.properties' },
            { key: 'model2', path: 'path2.properties' }
        ];

        fillDescriptorContent(content, ApplicationType.FREE_STYLE, '1.90.0', models);

        expect(content).toHaveLength(2);
    });

    it('should not add anything if i18nModels is undefined', () => {
        const content: Content[] = [];
        fillDescriptorContent(content, ApplicationType.FREE_STYLE, '1.90.0');
        expect(content).toHaveLength(0);
    });
});

describe('getManifestContent', () => {
    const baseConfig: AdpWriterConfig = {
        app: {
            layer: FlexLayer.VENDOR,
            appType: ApplicationType.FREE_STYLE,
            fioriId: 'F0001',
            ach: 'ZABC',
            i18nModels: [{ key: 'i18n', path: 'i18n/i18n.properties' }]
        },
        ui5: {
            version: '1.120.0',
            minVersion: '1.120.0',
            shouldSetMinVersion: true
        }
    } as AdpWriterConfig;

    it('should generate full content with support data and min UI5 version', () => {
        const result = getManifestContent(baseConfig);

        expect(result).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ changeType: 'appdescr_ui5_addNewModelEnhanceWith' }),
                expect.objectContaining({ changeType: 'appdescr_fiori_setRegistrationIds' }),
                expect.objectContaining({ changeType: 'appdescr_app_setAch' }),
                expect.objectContaining({ changeType: 'appdescr_ui5_setMinUI5Version' }),
                expect.objectContaining({ changeType: 'appdescr_app_setTitle' })
            ])
        );
    });

    it('should skip support data for CUSTOMER_BASE layer', () => {
        const config = {
            ...baseConfig,
            app: { ...baseConfig.app, layer: FlexLayer.CUSTOMER_BASE }
        } as AdpWriterConfig;
        const result = getManifestContent(config);
        const changeTypes = result.map((r) => r.changeType);

        expect(changeTypes).not.toContain('appdescr_fiori_setRegistrationIds');
        expect(changeTypes).not.toContain('appdescr_app_setAch');
        expect(changeTypes).toContain('appdescr_app_setTitle');
    });

    it('should skip minVersion entry if shouldSetMinVersion is false', () => {
        const config = {
            ...baseConfig,
            ui5: {
                ...baseConfig.ui5,
                shouldSetMinVersion: false
            }
        } as AdpWriterConfig;
        const result = getManifestContent(config);
        const types = result.map((c) => c.changeType);
        expect(types).not.toContain('appdescr_ui5_setMinUI5Version');
    });
});
