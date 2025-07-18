import { getApplicationType } from '../../../src/utils/application';

describe('getApplicationType - fev2', () => {
    const manifestMockListreportApp = {
        ['sap.ui.generic.app']: {
            pages: [
                {
                    entitySet: 'Products'
                }
            ]
        }
    } as any;

    const manifestMockOVPApp = {
        ['sap.ovp']: {
            pages: [
                {
                    entitySet: 'Products'
                }
            ]
        }
    } as any;
    test('fev2 - lrp app', () => {
        expect(getApplicationType(manifestMockListreportApp)).toBe('fe-v2');
    });
    test('fev2 - ovp app', () => {
        expect(getApplicationType(manifestMockOVPApp)).toBe('fe-v2');
    });
});

describe('getApplicationType - fev4', () => {
    const manifestMockListreportApp = {
        ['sap.ui5']: {
            routing: {
                targets: {
                    'ListReport|Products': {
                        name: 'sap.fe.templates.ListReport',
                        settings: {}
                    }
                }
            }
        }
    } as any;

    test('fev4 - lrp app', () => {
        expect(getApplicationType(manifestMockListreportApp)).toBe('fe-v4');
    });
});

describe('getApplicationType - freestyle', () => {
    const manifestMockListreportApp = {} as any;

    test('freestyle app', () => {
        expect(getApplicationType(manifestMockListreportApp)).toBe('freestyle');
    });
});
