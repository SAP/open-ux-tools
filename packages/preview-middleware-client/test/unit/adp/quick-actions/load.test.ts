import { loadDefinitions } from '../../../../src/adp/quick-actions/load';
import FEV4QuickActionRegistry from 'open/ux/preview/client/adp/quick-actions/fe-v4/registry';
import FEV2QuickActionRegistry from 'open/ux/preview/client/adp/quick-actions/fe-v2/registry';

describe('quick action dyncmic loading', () => {
    beforeEach(() => {
        jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key) => {
            if (key === 'com.sap.ux.control-property-editor.features.quick-actions') {
                return 'true';
            }
            return null;
        });
    });
    test('fe-v2', async () => {
        const definitions = await loadDefinitions('fe-v2');
        expect(definitions[0]).toBeInstanceOf(FEV2QuickActionRegistry);
    });
    test('fe-v4', async () => {
        const definitions = await loadDefinitions('fe-v4');
        expect(definitions[0]).toBeInstanceOf(FEV4QuickActionRegistry);
    });
});
