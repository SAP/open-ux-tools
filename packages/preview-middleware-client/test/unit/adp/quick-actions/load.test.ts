import { FeatureService } from '../../../../src/cpe/feature-service';
import { loadDefinitions } from '../../../../src/adp/quick-actions/load';
import FEV4QuickActionRegistry from 'open/ux/preview/client/adp/quick-actions/fe-v4/registry';
import FEV2QuickActionRegistry from 'open/ux/preview/client/adp/quick-actions/fe-v2/registry';

describe('quick action dynamic loading', () => {
    beforeEach(() => {
        jest.spyOn(FeatureService, 'isFeatureEnabled').mockImplementation((key: string) => {
            if (key === 'cpe.beta.quick-actions') {
                return true;
            }
            return false;
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
