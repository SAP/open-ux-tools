import { applyChange } from '../../../../src/cpe/changes/flex-change';
import type { UI5AdaptationOptions } from '../../../../src/cpe/types';
import type { PropertyChange } from '@sap-ux/control-property-editor-common';
import { sapCoreMock } from 'mock/window';
import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';

describe('flexChange', () => {
    // prepare
    const pushAndExecuteMock = jest.fn();
    rtaMock.getCommandStack.mockReturnValue({
        pushAndExecute: pushAndExecuteMock
    });
    
    const testOptions: UI5AdaptationOptions = {
        rta: rtaMock,
        generator: 'testGenerator',
        componentId: 'testComponentId',
        layer: 'VENDOR'
    };

    beforeEach(() => {
        pushAndExecuteMock.mockClear();
        CommandFactory.getCommandFor.mockClear();
    });

    test('applyChange - simple property', async () => {
        sapCoreMock.byId.mockReturnValueOnce({ name: 'sap.m.Button' });
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'blocked',
            value: false,
            controlName: 'controlName'
        };

        // act
        await applyChange(testOptions, change);

        // assert
        expect(CommandFactory.getCommandFor.mock.calls[0][1]).toBe('Property');
        expect(CommandFactory.getCommandFor.mock.calls[0][2]).toEqual({ 
            generator: testOptions.generator,
            propertyName: change.propertyName,
            newValue: change.value 
        });
        expect(pushAndExecuteMock).toBeCalled();
    });

    test('applyChange - simple string', async () => {
        sapCoreMock.byId.mockReturnValueOnce({ name: 'sap.m.Button' });
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'enabled',
            value: 'false',
            controlName: 'controlName'
        };

        // act
        await applyChange(testOptions, change);

        // assert
        expect(CommandFactory.getCommandFor.mock.calls[0][1]).toBe('Property');
        expect(CommandFactory.getCommandFor.mock.calls[0][2]).toEqual({ 
            generator: testOptions.generator,
            propertyName: change.propertyName,
            newValue: change.value 
        });
        expect(pushAndExecuteMock).toBeCalled();
    });

    test('applyChange - binding expression', async () => {
        sapCoreMock.byId.mockReturnValueOnce({ name: 'sap.m.Button' });
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'enabled',
            value: '{testModel>enabled}',
            controlName: 'controlName'
        };

        // act
        await applyChange(testOptions, change);

        // assert
        expect(CommandFactory.getCommandFor.mock.calls[0][1]).toBe('BindProperty');
        expect(CommandFactory.getCommandFor.mock.calls[0][2]).toEqual({ 
            generator: testOptions.generator,
            propertyName: change.propertyName,
            newBinding: change.value 
        });
        expect(pushAndExecuteMock).toBeCalled();
    });

    test('applyChange - undefined control', async () => {
        sapCoreMock.byId.mockReturnValueOnce(undefined);
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'enabled',
            value: 'false',
            controlName: 'controlName'
        };

        // act
        await applyChange(testOptions, change);

        // assert
        expect(pushAndExecuteMock).not.toBeCalled();
    });
});
