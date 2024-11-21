import type { Destination, Destinations } from '@sap-ux/btp-utils';
import type { AuthenticationType, BackendSystem } from '@sap-ux/store';
import { initI18nOdataServiceInquirer } from '../../../../../src/i18n';
import {
    createSystemChoices,
    getBackendSystemDisplayName
} from '../../../../../src/prompts/datasources/sap-system/system-selection/prompt-helpers';

const backendSystemBasic: BackendSystem = {
    name: 'http://abap.on.prem:1234',
    url: 'http://abap.on.prem:1234',
    username: 'user1',
    password: 'password1'
};
const backendSystemReentrance: BackendSystem = {
    name: 'http://s4hc:1234',
    url: 'http:/s4hc:1234',
    authenticationType: 'reentranceTicket'
};

const backendSystems: BackendSystem[] = [backendSystemBasic, backendSystemReentrance];
let mockIsAppStudio = false;
const destination1 = { Name: 'dest1', Host: 'http://dest1.com' } as Destination;
const destination2 = { Name: 'dest2', Host: 'https://dest2.com:12345' } as Destination;
let destinations: Destinations = { 'dest1': destination1, 'dest2': destination2 };

jest.mock('@sap-ux/store', () => ({
    __esModule: true, // Workaround to for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('@sap-ux/store'),
    // Mock store access
    SystemService: jest.fn().mockImplementation(() => ({
        getAll: jest.fn().mockResolvedValue(backendSystems)
    }))
}));

jest.mock('@sap-ux/btp-utils', () => ({
    ...jest.requireActual('@sap-ux/btp-utils'),
    isAppStudio: jest.fn().mockImplementation(() => mockIsAppStudio),
    listDestinations: jest.fn().mockImplementation(() => destinations)
}));

describe('Test system selection prompt helpers', () => {
    beforeAll(async () => {
        // Initialize i18n before running tests
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        mockIsAppStudio = false;
    });

    test('Should get backend system display name', () => {
        expect(
            getBackendSystemDisplayName({
                name: 'systemA',
                userDisplayName: 'userDisplayName1',
                authenticationType: 'reentranceTicket' as AuthenticationType
            } as BackendSystem)
        ).toEqual('systemA (S4HC) [userDisplayName1]');

        expect(
            getBackendSystemDisplayName({
                name: 'systemB',
                userDisplayName: 'userDisplayName2',
                serviceKeys: { url: 'Im a service key' }
            } as BackendSystem)
        ).toEqual('systemB (BTP) [userDisplayName2]');
    });

    test('Should create system selection choices', async () => {
        expect(await createSystemChoices()).toEqual([
            {
                name: 'New system',
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
                name: `${backendSystemReentrance.name} (S4HC)`,
                value: {
                    system: backendSystemReentrance,
                    type: 'backendSystem'
                }
            }
        ]);
        mockIsAppStudio = true;
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
        destinations = { destFull1, destPartial1, destOnPrem, destInternet };

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
});
