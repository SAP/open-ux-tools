import { initI18n, t } from '../../src/i18n';
import { getAbapSystemChoices, getPackageChoices, updatePromptStateUrl } from '../../src/prompts/helpers';
import { PromptState } from '@sap-ux/deploy-config-generator-shared';
import { queryPackages } from '../../src/utils';
import { mockDestinations } from '../fixtures/destinations';
import { mockTargetSystems } from '../fixtures/targets';

jest.mock('../../src/utils', () => ({
    queryPackages: jest.fn()
}));

const mockQueryPackages = queryPackages as jest.Mock;

describe('helpers', () => {
    beforeAll(async () => {
        await initI18n();
    });

    describe('getBackendTargetChoices', () => {
        it('should return backend target choices', async () => {
            const mockServiceProvider = {
                user: () => 'mockUser'
            } as any;
            const backendTarget = {
                systemName: 'New System',
                serviceProvider: mockServiceProvider,
                abapTarget: {
                    name: 'New Target',
                    url: 'https://mock.url.new.target.com',
                    client: '100',
                    userDisplayName: 'mockUser'
                }
            };
            const systemChoices = await getAbapSystemChoices(undefined, backendTarget, mockTargetSystems);
            expect(systemChoices).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "Enter Target System URL",
                    "value": "Url",
                  },
                  Object {
                    "client": "100",
                    "isDefault": true,
                    "isS4HC": false,
                    "name": "New System [mockUser] (Source system)",
                    "scp": undefined,
                    "value": "https://mock.url.new.target.com",
                  },
                  Object {
                    "client": "000",
                    "isDefault": false,
                    "isS4HC": false,
                    "name": "target1 [mockUser]",
                    "scp": false,
                    "value": "https://mock.url.target1.com",
                  },
                  Object {
                    "client": "001",
                    "isDefault": false,
                    "isS4HC": true,
                    "name": "target2 (S4HC) [mockUser2]",
                    "scp": false,
                    "value": "https://mock.url.target2.com",
                  },
                ]
            `);
        });

        it('should return backend target choices (no backend target / default)', async () => {
            const systemChoices = await getAbapSystemChoices(undefined, undefined, mockTargetSystems);
            expect(systemChoices).toMatchInlineSnapshot(`
                Array [
                  Object {
                    "name": "Enter Target System URL",
                    "value": "Url",
                  },
                  Object {
                    "client": "000",
                    "isDefault": false,
                    "isS4HC": false,
                    "name": "target1 [mockUser]",
                    "scp": false,
                    "value": "https://mock.url.target1.com",
                  },
                  Object {
                    "client": "001",
                    "isDefault": false,
                    "isS4HC": true,
                    "name": "target2 (S4HC) [mockUser2]",
                    "scp": false,
                    "value": "https://mock.url.target2.com",
                  },
                ]
            `);
        });
    });

    describe('updatePromptStateUrl', () => {
        beforeEach(() => {
            PromptState.resetAbapDeployConfig();
        });

        it('should update prompt state url (destination)', () => {
            updatePromptStateUrl({ url: '', package: '', destination: 'Dest1' }, mockDestinations);
            expect(PromptState.abapDeployConfig.url).toBe('https://mock.url.dest1.com');
        });
    });

    describe('getPackageChoices', () => {
        it('should return package choices and empty message', async () => {
            mockQueryPackages.mockResolvedValueOnce(['package1', 'package2']);
            const result = await getPackageChoices(true, 'pack', { url: '', package: '' });
            expect(result).toEqual({
                packages: ['package1', 'package2'],
                morePackageResultsMsg: ''
            });
        });

        it('should return package choices and number of packages message', async () => {
            const packages = ['package1'];

            for (let i = 2; i <= 50; i++) {
                packages.push(`package${i}`);
            }

            mockQueryPackages.mockResolvedValueOnce(packages);
            const result = await getPackageChoices(true, 'pack', { url: '', package: '' });
            expect(result).toEqual({
                packages,
                morePackageResultsMsg: t('prompts.config.package.packageAutocomplete.sourceMessage', {
                    numResults: packages.length
                })
            });
        });

        it('should return package choices and have previous answer to the top', async () => {
            mockQueryPackages.mockResolvedValueOnce(['package1', 'package2', 'package3']);

            const result = await getPackageChoices(true, 'pack', {
                url: '',
                package: '',
                packageAutocomplete: 'package3'
            });
            expect(result).toEqual({
                packages: ['package3', 'package1', 'package2'],
                morePackageResultsMsg: ''
            });
        });
    });
});
