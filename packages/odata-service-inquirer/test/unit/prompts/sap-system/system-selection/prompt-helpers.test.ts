import { listDestinations } from '@sap-ux/btp-utils';
import { initI18nOdataServiceInquirer } from '../../../../../src/i18n';
import {
    CfAbapEnvServiceChoice,
    createSystemChoices,
    findDefaultSystemSelectionIndex,
    NewSystemChoice
} from '../../../../../src/prompts/datasources/sap-system/system-selection/prompt-helpers';
import type { AuthenticationType, BackendSystem } from '@sap-ux/store';
import type { Destination, Destinations } from '@sap-ux/btp-utils';
import type { AxiosError } from '@sap-ux/axios-extension';

const backendSystemBasic: BackendSystem = {
    name: 'http://abap.on.prem:1234',
    url: 'http://abap.on.prem:1234',
    username: 'user1',
    password: 'password1',
    systemType: 'OnPrem'
};

const backendSystemReentrance: BackendSystem = {
    name: 'http://s4hc:1234',
    url: 'http:/s4hc:1234',
    authenticationType: 'reentranceTicket',
    systemType: 'S4HC'
};

const backendSystems: BackendSystem[] = [backendSystemBasic, backendSystemReentrance];
const destination1 = { Name: 'dest1', Host: 'http://dest1.com' } as Destination;
const destination2 = { Name: 'dest2', Host: 'https://dest2.com:12345' } as Destination;
const baseTestDestinations: Destinations = { 'dest1': destination1, 'dest2': destination2 };

const mockAxiosError403 = {
    response: {
        status: 403,
        statusText: 'Forbidden'
    },
    message: 'Request failed with status code 403'
} as AxiosError;

jest.mock('@sap-ux/store', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('@sap-ux/store'),
    // Mock store access
    SystemService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValueOnce(backendSystems),
        partialUpdate: jest.fn().mockImplementation((system: BackendSystem) => {
            return Promise.resolve(system);
        })
    }))
}));

let mockIsAppStudio = false;
jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn().mockImplementation(() => mockIsAppStudio),
    listDestinations: jest.fn().mockImplementation(() => jest.fn())
}));
const mockListDestinations = listDestinations as jest.Mock;

describe('Test system selection prompt helpers', () => {
    beforeAll(async () => {
        // Initialize i18n before running tests
        await initI18nOdataServiceInquirer();
    });

    describe('Test creating backend system choices', () => {
        beforeEach(() => {
            mockIsAppStudio = false;
        });

        test('Should create backend system selection choices', async () => {
            expect(await createSystemChoices()).toEqual([
                {
                    name: 'New System',
                    value: {
                        system: '!@£*&937newSystem*X~qy^',
                        type: 'newSystemChoice'
                    }
                },
                {
                    name: backendSystemBasic.name,
                    value: {
                        system: backendSystemBasic,
                        type: 'backendSystem'
                    }
                },
                {
                    name: `${backendSystemReentrance.name} (ABAP Cloud)`,
                    value: {
                        system: backendSystemReentrance,
                        type: 'backendSystem'
                    }
                }
            ]);
        });

        test('Should return index of default', async () => {
            const nonBasChoices = await createSystemChoices();
            expect(findDefaultSystemSelectionIndex(nonBasChoices, 'no such system')).toEqual(-1);
            expect(findDefaultSystemSelectionIndex(nonBasChoices, NewSystemChoice)).toEqual(0);
            expect(findDefaultSystemSelectionIndex(nonBasChoices, backendSystemBasic.name)).toEqual(1);
            expect(findDefaultSystemSelectionIndex(nonBasChoices, backendSystemReentrance.name)).toEqual(2);
        });
    });

    describe('Test creating BAS destination system choices', () => {
        beforeEach(() => {
            mockIsAppStudio = true;
            jest.clearAllMocks();
        });

        test('should create system choices for BAS destinations', async () => {
            mockListDestinations.mockImplementation(() => {
                return baseTestDestinations;
            });
            expect(await createSystemChoices()).toEqual([
                {
                    name: 'dest1',
                    value: {
                        system: destination1,
                        type: 'destination'
                    }
                },
                {
                    name: 'dest2',
                    value: {
                        system: destination2,
                        type: 'destination'
                    }
                }
            ]);

            // Filter choices based on destination type
            const destFull1 = {
                Name: 'destFull1',
                Host: 'http://dest1.com/full/service/path',
                WebIDEAdditionalData: `full_url`,
                WebIDEUsage: 'odata_gen'
            } as Destination;
            const destPartial1 = {
                Name: 'destPartial1',
                Host: 'http://dest1.com/',
                WebIDEUsage: 'odata_gen'
            } as Destination;
            const destOnPrem = {
                Name: 'destOnPrem1',
                Host: 'http://dest1.com/',
                ProxyType: 'OnPremise',
                WebIDEUsage: 'odata_abap'
            } as Destination;
            const destInternet = {
                Name: 'destInternet1',
                Host: 'http://dest1.com/',
                ProxyType: 'Internet',
                WebIDEUsage: 'odata_abap'
            } as Destination;

            mockListDestinations.mockImplementation(() => {
                return { destFull1, destPartial1, destOnPrem, destInternet };
            });
            expect(
                await createSystemChoices({
                    full_service_url: true,
                    partial_service_url: true
                })
            ).toEqual(
                expect.arrayContaining([
                    { name: destFull1.Name, value: { system: destFull1, type: 'destination' } },
                    { name: destPartial1.Name, value: { system: destPartial1, type: 'destination' } }
                ])
            );

            expect(
                await createSystemChoices({
                    odata_abap: true
                })
            ).toEqual(
                expect.arrayContaining([
                    { name: destOnPrem.Name, value: { system: destOnPrem, type: 'destination' } },
                    { name: destInternet.Name, value: { system: destInternet, type: 'destination' } }
                ])
            );

            expect(
                await createSystemChoices({
                    odata_generic: true,
                    odata_abap: true
                })
            ).toEqual(
                expect.arrayContaining([
                    { name: destOnPrem.Name, value: { system: destOnPrem, type: 'destination' } },
                    { name: destInternet.Name, value: { system: destInternet, type: 'destination' } },
                    { name: destFull1.Name, value: { system: destFull1, type: 'destination' } },
                    { name: destPartial1.Name, value: { system: destPartial1, type: 'destination' } }
                ])
            );
        });

        test('Should handle 403 error from listDestinations', async () => {
            mockListDestinations.mockRejectedValue(mockAxiosError403);
            expect(await createSystemChoices()).toEqual([]);

            // Include CF ABAP env choice
            const systemChoices = await createSystemChoices(undefined, true);
            expect(systemChoices.length).toEqual(1);
            expect(systemChoices[0].name).toEqual('Cloud Foundry ABAP environment on SAP Business Technology Platform');
            expect(systemChoices[0].value).toEqual({
                system: CfAbapEnvServiceChoice,
                type: CfAbapEnvServiceChoice
            });
        });

        test('Should return index of default', async () => {
            mockListDestinations.mockImplementation(() => {
                return baseTestDestinations;
            });
            let basChoices = await createSystemChoices();
            expect(findDefaultSystemSelectionIndex(basChoices, NewSystemChoice)).toEqual(-1);
            expect(findDefaultSystemSelectionIndex(basChoices, CfAbapEnvServiceChoice)).toEqual(-1);
            expect(findDefaultSystemSelectionIndex(basChoices, destination1.Name)).toEqual(0);
            expect(findDefaultSystemSelectionIndex(basChoices, destination2.Name)).toEqual(1);

            // Include CF ABAP env choice
            basChoices = await createSystemChoices(undefined, true);
            expect(findDefaultSystemSelectionIndex(basChoices, CfAbapEnvServiceChoice)).toEqual(0);
            expect(findDefaultSystemSelectionIndex(basChoices, destination1.Name)).toEqual(1);
            expect(findDefaultSystemSelectionIndex(basChoices, destination2.Name)).toEqual(2);
        });
    });
});
