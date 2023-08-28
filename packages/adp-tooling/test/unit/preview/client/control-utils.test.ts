import ControlUtils from '../../../../src/preview/client/control-utils';
import type ManagedObject from 'sap/ui/base/ManagedObject';

describe('client/control-utils', () => {
    describe('getControlAggregationByName', () => {
        const metadata = {
            getAllAggregations: jest.fn().mockReturnValue({}),
            getJSONKeys: jest.fn().mockReturnValue({})
        };
        const mockControl = {
            getMetadata: () => metadata,
            mockGetSomething: jest.fn().mockReturnValue({})
        };
        type controlType = ManagedObject & { __calledJSONKeys?: boolean; [key: string]: any };

        test('no control provided', () => {
            const result = ControlUtils.getControlAggregationByName(undefined as unknown as controlType, 'test');
            expect(result).toHaveLength(0);
        });

        test('has aggregations', () => {
            const name = '~name';
            metadata.getAllAggregations.mockReturnValueOnce({
                [name]: {
                    _sGetter: 'mockGetSomething'
                }
            });
            const result = ControlUtils.getControlAggregationByName(mockControl as unknown as controlType, name);
            expect(result).toHaveLength(1);
        });
    });
});
