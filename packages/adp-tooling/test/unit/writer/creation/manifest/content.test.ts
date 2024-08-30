import {
    isFeatureSupportedVersion,
    createDescriptorChangeForResourceModel,
    ApplicationType,
    fillDescriptorContent,
    fillSupportData,
    FlexLayer,
    getManifestContent
} from '../../../../../src';
import type { AdpWriterConfig, Content } from '../../../../../src';

const isSupportedMock = isFeatureSupportedVersion as jest.Mock;

jest.mock('../../../../../src/common/ui5/utils.ts', () => ({
    isFeatureSupportedVersion: jest.fn()
}));

describe('Descriptor Utilities', () => {
    describe('createDescriptorChangeForResourceModel', () => {
        it('creates a resource model descriptor change for FREE_STYLE application with fallbackLocale', () => {
            isSupportedMock.mockReturnValue(true);
            const result = createDescriptorChangeForResourceModel(
                'i18n',
                'i18n/i18n.properties',
                ApplicationType.FREE_STYLE,
                '1.127.0'
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

        it('creates a standard resource model descriptor change for non FREE_STYLE application', () => {
            const result = createDescriptorChangeForResourceModel(
                'i18n',
                'i18n/i18n.properties',
                ApplicationType.FIORI_ELEMENTS,
                '1.127.0'
            );

            expect(result).toEqual({
                changeType: 'appdescr_ui5_addNewModelEnhanceWith',
                content: {
                    modelId: 'i18n'
                },
                texts: {
                    i18n: 'i18n/i18n.properties'
                }
            });
        });
    });

    describe('fillDescriptorContent', () => {
        it('populates content with descriptor changes from resource models', () => {
            const content: Content[] = [];
            const i18nModels = [{ key: 'i18n', path: 'i18n/i18n.properties' }];
            fillDescriptorContent(content, ApplicationType.FREE_STYLE, '1.127.0', i18nModels);

            expect(content.length).toBe(1);
            expect(content[0].changeType).toBe('appdescr_ui5_addNewModelEnhanceWith');
        });
    });

    describe('fillSupportData', () => {
        it('adds support data for Fiori registration IDs and ACH to content array', () => {
            const content: Content[] = [];
            fillSupportData(content, 'fioriId1', 'ach1');

            expect(content.length).toBe(2);
            expect(content[0].content).toEqual({ registrationIds: ['fioriId1'] });
            expect(content[1].content).toEqual({ ach: 'ACH1' });
        });
    });

    describe('getManifestContent', () => {
        it('generates a complete array of content objects for a manifest (CUSTOMER_BASE layer)', () => {
            const config = {
                app: {
                    ach: 'ACH1',
                    fioriId: 'fioriId1',
                    appType: ApplicationType.FREE_STYLE,
                    layer: FlexLayer.CUSTOMER_BASE,
                    i18nModels: [{ key: 'i18n', path: 'i18n/model1.properties' }]
                },
                ui5: {
                    version: '1.127.0',
                    shouldSetMinVersion: true,
                    minVersion: '1.127.0'
                }
            } as AdpWriterConfig;

            const content = getManifestContent(config);

            expect(content.length).toBeGreaterThanOrEqual(3);
            expect(content).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ changeType: 'appdescr_ui5_setMinUI5Version' }),
                    expect.objectContaining({ changeType: 'appdescr_app_setTitle' })
                ])
            );
        });

        it('generates a complete array of content objects for a manifest (VENDOR layer)', () => {
            const config = {
                app: {
                    ach: 'ach1',
                    fioriId: 'fioriId1',
                    appType: ApplicationType.FREE_STYLE,
                    layer: FlexLayer.VENDOR,
                    i18nModels: [{ key: 'i18n', path: 'i18n/model1.properties' }]
                },
                ui5: {
                    version: '1.127.0',
                    shouldSetMinVersion: true,
                    minVersion: '1.127.0'
                }
            } as AdpWriterConfig;

            const content = getManifestContent(config);

            expect(content.length).toBeGreaterThanOrEqual(4);
            expect(content).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ changeType: 'appdescr_ui5_setMinUI5Version' }),
                    expect.objectContaining({ changeType: 'appdescr_app_setTitle' }),
                    expect.objectContaining({ changeType: 'appdescr_fiori_setRegistrationIds' }),
                    expect.objectContaining({ changeType: 'appdescr_app_setAch' })
                ])
            );
        });
    });
});
