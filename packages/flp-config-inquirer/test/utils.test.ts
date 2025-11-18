import * as adpTooling from '@sap-ux/adp-tooling';

import { getAdpFlpConfigPromptOptions, getAdpFlpInboundsWriterConfig } from '../src/utils';
import { tileActions, type TileSettingsAnswers, type FLPConfigAnswers } from '../src/types';

jest.mock('@sap-ux/adp-tooling', () => ({
    flpConfigurationExists: jest.fn()
}));

describe('utils', () => {
    const inbounds = {
        'display-bank': {
            semanticObject: 'semanticObject_Base',
            action: 'action_Base',
            title: 'title_Base',
            subTitle: 'subTitle_Base',
            icon: 'sap-icon://Icon_Base',
            additionalParameters: {}
        }
    };
    describe('getAdpFlpConfigPromptOptions', () => {
        it('should return correct options when inbounds is undefined', () => {
            const promptOptions = getAdpFlpConfigPromptOptions({
                tileHandlingAction: tileActions.ADD,
                copyFromExisting: false
            });

            expect(promptOptions).toEqual(
                expect.objectContaining({
                    existingFlpConfigInfo: { hide: true },
                    action: { executeDuplicateValidation: true },
                    inboundId: { hide: true },
                    overwrite: { hide: true }
                })
            );
        });

        it('should return correct options when FLP configuration exists', () => {
            jest.spyOn(adpTooling, 'flpConfigurationExists').mockReturnValue(true);

            const promptOptions = getAdpFlpConfigPromptOptions(
                {
                    tileHandlingAction: tileActions.ADD,
                    copyFromExisting: false
                } as TileSettingsAnswers,
                undefined,
                {} as adpTooling.DescriptorVariant
            );

            expect(promptOptions).toEqual(
                expect.objectContaining({
                    existingFlpConfigInfo: { hide: false },
                    action: { executeDuplicateValidation: true },
                    inboundId: { hide: true },
                    overwrite: { hide: true }
                })
            );
        });

        it('should return correct options when tileHandlingAction is REPLACE', () => {
            const promptOptions = getAdpFlpConfigPromptOptions(
                {
                    tileHandlingAction: tileActions.REPLACE
                } as TileSettingsAnswers,
                inbounds
            );

            expect(promptOptions).toEqual(
                expect.objectContaining({
                    existingFlpConfigInfo: { hide: true },
                    overwrite: { hide: true },
                    semanticObject: { hide: true },
                    action: { hide: true, showTooltip: true },
                    additionalParameters: { hide: true }
                })
            );
        });

        it('should return default options for other cases', () => {
            const promptOptions = getAdpFlpConfigPromptOptions(
                { tileHandlingAction: tileActions.ADD, copyFromExisting: true },
                inbounds
            );
            expect(promptOptions).toEqual(
                expect.objectContaining({
                    existingFlpConfigInfo: { hide: true },
                    semanticObject: { showTooltip: true },
                    action: { executeDuplicateValidation: true, showTooltip: true },
                    overwrite: { hide: true }
                })
            );
        });
    });

    describe('getAdpFlpInboundsWriterConfig', () => {
        it('should return config for REPLACE scenario', () => {
            const tileSettingsAnswers = { tileHandlingAction: tileActions.REPLACE };

            const writerConfig = getAdpFlpInboundsWriterConfig(
                undefined,
                adpTooling.FlexLayer.CUSTOMER_BASE,
                tileSettingsAnswers as TileSettingsAnswers,
                {
                    inboundId: {
                        semanticObject: 'semanticObject_Base',
                        action: 'action_Base'
                    },
                    inboundId2: {
                        semanticObject: 'semanticObject_Other',
                        action: 'action_Other'
                    }
                }
            );

            expect(writerConfig).toEqual([
                {
                    inboundId: 'customer.inboundId',
                    semanticObject: 'semanticObject_Base',
                    action: 'action_Base',
                    title: '',
                    subTitle: '',
                    icon: '',
                    additionalParameters: ''
                },
                {
                    inboundId: 'customer.inboundId2',
                    semanticObject: 'semanticObject_Other',
                    action: 'action_Other',
                    title: '',
                    subTitle: '',
                    icon: '',
                    additionalParameters: ''
                }
            ]);
        });

        it('should return empty array for config if no answers REPLACE scenario', () => {
            const tileSettingsAnswers = { tileHandlingAction: tileActions.REPLACE };

            const writerConfig = getAdpFlpInboundsWriterConfig(
                {} as unknown as FLPConfigAnswers,
                adpTooling.FlexLayer.CUSTOMER_BASE,
                tileSettingsAnswers as TileSettingsAnswers
            );

            expect(writerConfig).toEqual([]);
        });

        it('should return config for ADD scenario', () => {
            const flpConfigAnswers = {
                semanticObject: 'semanticObject_New',
                action: 'action_New',
                title: 'title_New',
                subTitle: 'subTitle_New',
                icon: 'icon_New',
                additionalParameters: '{ "param1": "value1" }'
            };
            const tileSettingsAnswers = { tileHandlingAction: tileActions.ADD, copyFromExisting: false };

            const writerConfig = getAdpFlpInboundsWriterConfig(
                flpConfigAnswers,
                adpTooling.FlexLayer.CUSTOMER_BASE,
                tileSettingsAnswers
            );

            expect(writerConfig).toEqual([
                {
                    inboundId: 'customer.semanticObject_New-action_New',
                    semanticObject: 'semanticObject_New',
                    action: 'action_New',
                    title: 'title_New',
                    subTitle: 'subTitle_New',
                    icon: 'icon_New',
                    additionalParameters: '{ "param1": "value1" }'
                }
            ]);
        });

        it('should return config emptry strings for config if no answers ADD scenario', () => {
            const tileSettingsAnswers = { tileHandlingAction: tileActions.ADD, copyFromExisting: false };

            const writerConfig = getAdpFlpInboundsWriterConfig(
                {} as unknown as FLPConfigAnswers,
                adpTooling.FlexLayer.CUSTOMER_BASE,
                tileSettingsAnswers
            );

            expect(writerConfig).toEqual([
                {
                    inboundId: '',
                    semanticObject: '',
                    action: '',
                    title: '',
                    subTitle: '',
                    icon: '',
                    additionalParameters: ''
                }
            ]);
        });

        it('should handle missing tileSettingsAnswers', () => {
            const flpConfigAnswers = {
                semanticObject: 'so3',
                action: 'act3',
                title: 'Title3',
                subTitle: 'Sub3',
                icon: 'icon3',
                additionalParameters: 'params3'
            };

            const writerConfig = getAdpFlpInboundsWriterConfig(flpConfigAnswers, adpTooling.FlexLayer.VENDOR);

            expect(writerConfig).toEqual([
                {
                    inboundId: 'so3-act3',
                    semanticObject: 'so3',
                    action: 'act3',
                    title: 'Title3',
                    subTitle: 'Sub3',
                    icon: 'icon3',
                    additionalParameters: 'params3'
                }
            ]);
        });
    });
});
