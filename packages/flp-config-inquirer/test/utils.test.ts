import { getAdpFlpConfigPromptOptions, getAdpFlpInboundsWriterConfig } from '../src/utils';
import { tileActions, type TileSettingsAnswers, type FLPConfigAnswers } from '../src/types';
import * as adpTooling from '@sap-ux/adp-tooling';

jest.mock('@sap-ux/adp-tooling', () => ({
    flpConfigurationExists: jest.fn()
}));

describe('utils', () => {
    const inbounds = {
        'display-bank': {
            semanticObject: 'test',
            action: 'action',
            title: 'testTitle',
            subTitle: 'testSubTitle',
            icon: 'sap-icon://test',
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
                    semanticObject: { showTooltip: true },
                    action: { executeDuplicateValidation: true, showTooltip: true },
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
                    semanticObject: { showTooltip: true },
                    action: { executeDuplicateValidation: true, showTooltip: true },
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
        it('should return config for REPLACE action', () => {
            const flpConfigAnswers = {
                inboundId: {
                    semanticObject: 'so',
                    action: 'act',
                    signature: { parameters: { foo: 'bar' } }
                },
                title: 'Title',
                subTitle: 'Sub',
                icon: 'icon'
            };
            const tileSettingsAnswers = { tileHandlingAction: tileActions.REPLACE };

            const writerConfig = getAdpFlpInboundsWriterConfig(
                flpConfigAnswers as unknown as FLPConfigAnswers,
                tileSettingsAnswers as TileSettingsAnswers
            );

            expect(writerConfig).toEqual({
                inboundId: 'so-act',
                semanticObject: 'so',
                action: 'act',
                title: 'Title',
                subTitle: 'Sub',
                icon: 'icon',
                additionalParameters: JSON.stringify({ foo: 'bar' })
            });
        });

        it('should return config for ADD action', () => {
            const flpConfigAnswers = {
                semanticObject: 'so2',
                action: 'act2',
                title: 'Title2',
                subTitle: 'Sub2',
                icon: 'icon2',
                additionalParameters: 'params'
            };
            const tileSettingsAnswers = { tileHandlingAction: tileActions.ADD };

            const writerConfig = getAdpFlpInboundsWriterConfig(
                flpConfigAnswers,
                tileSettingsAnswers as TileSettingsAnswers
            );

            expect(writerConfig).toEqual({
                inboundId: 'so2-act2',
                semanticObject: 'so2',
                action: 'act2',
                title: 'Title2',
                subTitle: 'Sub2',
                icon: 'icon2',
                additionalParameters: 'params'
            });
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

            const writerConfig = getAdpFlpInboundsWriterConfig(flpConfigAnswers);

            expect(writerConfig).toEqual({
                inboundId: 'so3-act3',
                semanticObject: 'so3',
                action: 'act3',
                title: 'Title3',
                subTitle: 'Sub3',
                icon: 'icon3',
                additionalParameters: 'params3'
            });
        });
    });
});
