import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';
import Log from 'mock/sap/base/Log';
import { fetchMock } from 'mock/window';
import { CommunicationService } from 'open/ux/preview/client/cpe/communication-service';
import type { SchemaForApiJsonFiles } from '../../../src/cpe/api-json';
import * as Documentation from '../../../src/cpe/documentation';
import * as Utils from '../../../src/cpe/utils';
import apiJson from '../../fixtures/api.json';

describe('Documentation', () => {
    const sapUiCompMetadata = JSON.parse(JSON.stringify(apiJson));
    const ui5ApiDtMetadata: Map<string, SchemaForApiJsonFiles> = new Map();
    ui5ApiDtMetadata.set('sap.ui.comp', sapUiCompMetadata);
    const apiJsonSuccess = {
        json: () => {
            return sapUiCompMetadata;
        },
        ok: true
    };
    const apiJsonNotFound = {
        ok: false,
        status: 404,
        statusText: `Not found 404`,
        url: 'api.json'
    };
    const apiJsonServerError = {
        ok: false,
        status: 505,
        statusText: `Server error 500`,
        url: 'api.json'
    };

    beforeEach(() => {
        jest.spyOn(CommunicationService, 'sendAction');
        jest.clearAllMocks();
    });

    test('Get Documention for sap.ui.comp.filterbar.FilterBar', async () => {
        fetchMock.mockResolvedValue(apiJsonSuccess);

        jest.spyOn(Utils, 'getLibrary').mockImplementation(() => {
            return Promise.resolve('');
        });
        const result = await Documentation.getDocumentation('sap.ui.comp.filterbar.FilterBar', 'sap.ui.comp');
        expect(result).toMatchSnapshot();
        expect(CommunicationService.sendAction).not.toHaveBeenCalled();
    });

    test('When the UI component has no api.json file provided then we do not show message in the info center', async () => {
        fetchMock.mockResolvedValue(apiJsonNotFound);

        jest.spyOn(Utils, 'getLibrary').mockImplementation(() => {
            return Promise.resolve('');
        });
        const result = await Documentation.getDocumentation(
            'sap.fe.controls.easyFilter.EasyFilterBarContainer',
            'sap.fe.controls.easyFilter'
        );
        expect(result).toBeUndefined();
        expect(CommunicationService.sendAction).not.toHaveBeenCalled();
        expect(Log.error).toHaveBeenCalledWith(`Error in getting documentation for sap.fe.controls.easyFilter`);
    });

    test('When the api json respond with status different than 200 and 404 then we display the error in the info center', async () => {
        fetchMock.mockResolvedValue(apiJsonServerError);

        jest.spyOn(Utils, 'getLibrary').mockImplementation(() => {
            return Promise.resolve('');
        });
        const result = await Documentation.getDocumentation('sap.fe.macros.Table', 'sap.fe.macros');
        expect(result).toBeUndefined();
        expect(CommunicationService.sendAction).toHaveBeenCalledWith(
            showInfoCenterMessage({
                title: 'Documentation Error',
                description: `An error occurred in getting documentation for sap.fe.macros. Check the control exists and try again.`,
                type: MessageBarType.error
            })
        );
    });
});
