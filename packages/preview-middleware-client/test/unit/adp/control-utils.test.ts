/* eslint-disable @typescript-eslint/ban-ts-comment */
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type ManagedObject from 'sap/ui/base/ManagedObject';

import ControlUtils from '../../../src/adp/control-utils';

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

        test('has no _sGetter', () => {
            const name = '~name';
            metadata.getAllAggregations.mockReturnValueOnce({
                [name]: {
                    _sGetter: undefined
                }
            });
            const result = ControlUtils.getControlAggregationByName(mockControl as unknown as controlType, name);
            expect(result).toHaveLength(0);
        });
    });

    describe('getRuntimeControl', () => {
        const runtimeControl = {
            sParentAggregationName: 'headerToolbar',
            sTag: 'Div',
            mAggregations: {},
            mAssociations: {},
            aCustomStyleClasses: {},
            getId: () => 'some-id'
        };

        test('should return runtime control if there is element instance', () => {
            const overlayControl = {
                sId: '__overlay00',
                getElementInstance: () => runtimeControl,
                getElement: () => runtimeControl
            };
            const control = ControlUtils.getRuntimeControl(overlayControl as unknown as ElementOverlay);

            expect(control.getId()).toBe('some-id');
        });

        test('should return runtime control', () => {
            const overlayControl = {
                sId: '__overlay00',
                getElement: () => runtimeControl
            };
            const control = ControlUtils.getRuntimeControl(overlayControl as unknown as ElementOverlay);

            expect(control.getId()).toBe('some-id');
        });
    });
});
