import * as promptHelper from '../src/prompts';

const mockIsAppStudio = jest.fn();
jest.mock('@sap-ux/btp-utils', () => ({
    ...(jest.requireActual('@sap-ux/btp-utils') as {}),
    isAppStudio: () => mockIsAppStudio()
}));

jest.setTimeout(20000);

const providerMock = {
    get: jest.fn().mockResolvedValue({})
} as any;

describe('test helper functions', () => {
    afterAll(() => {});

    test('getBusinessObjects', async () => {
        const testBusinessObjects = [{ name: 'I_BANKTP', description: 'Banking', type: 'Business Object' }];
        const providerMock = {
            get: jest.fn(),
            getAdtService: jest.fn().mockResolvedValue({
                getBusinessObjects: jest.fn().mockResolvedValue(testBusinessObjects)
            })
        } as any;
        expect(await promptHelper.getBusinessObjects(providerMock)).toEqual([
            { name: 'I_BANKTP (Banking)', value: { description: 'Banking', name: 'I_BANKTP', type: 'Business Object' } }
        ]);
    });

    test('getAbapCDSViews', async () => {
        const testCDSViews = [
            { name: 'C_GRANTORCLAIMITEMDEX', description: 'Abap CDS View', uri: 'test/uri/for/cds/view' }
        ];
        const providerMock = {
            get: jest.fn(),
            getAdtService: jest.fn().mockResolvedValue({
                getAbapCDSViews: jest.fn().mockResolvedValue(testCDSViews)
            })
        } as any;
        expect(await promptHelper.getAbapCDSViews(providerMock)).toEqual([
            {
                name: 'C_GRANTORCLAIMITEMDEX (Abap CDS View)',
                value: { description: 'Abap CDS View', name: 'C_GRANTORCLAIMITEMDEX', uri: 'test/uri/for/cds/view' }
            }
        ]);
    });
});
