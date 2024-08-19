import { applyChange } from '../../../../src/cpe/changes/flex-change';
import type { UI5AdaptationOptions } from '../../../../src/cpe/types';
import type { PropertyChange } from '@sap-ux-private/control-property-editor-common';
import { sapCoreMock } from 'mock/window';
import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

describe('flexChange', () => {
    // prepare
    const control = {
        name: 'sap.m.Button',
        getMetadata: function () {
            return {
                getAllProperties: function () {
                    return {
                        type: 'number'
                    };
                }
            };
        }
    };
    const pushAndExecuteMock = jest.fn();
    const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
    rtaMock.getCommandStack.mockReturnValue({
        pushAndExecute: pushAndExecuteMock
    });
    const flexSettings = {
        generator: 'testGenerator',
        componentId: 'testComponentId',
        layer: 'VENDOR'
    };
    rtaMock.getFlexSettings.mockReturnValue(flexSettings);

    const testOptions: UI5AdaptationOptions = {
        rta: rtaMock as unknown as RuntimeAuthoring
    };
    const mockCommand = {
        command: 'testCommand'
    };
    CommandFactory.getCommandFor.mockReturnValue(mockCommand);

    beforeEach(() => {
        pushAndExecuteMock.mockClear();
        CommandFactory.getCommandFor.mockClear();
    });

    test('applyChange - simple property', async () => {
        sapCoreMock.byId.mockReturnValueOnce(control);
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'blocked',
            value: false,
            controlName: 'controlName',
            changeType: 'propertyChange'
        };

        // act
        await applyChange(testOptions, change);

        // assert
        expect(CommandFactory.getCommandFor).toBeCalledWith(
            control,
            'Property',
            {
                generator: flexSettings.generator,
                propertyName: change.propertyName,
                newValue: change.value
            },
            null,
            flexSettings
        );
        expect(pushAndExecuteMock).toBeCalledWith(mockCommand);
    });

    test('applyChange - simple string', async () => {
        sapCoreMock.byId.mockReturnValueOnce(control);
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'text',
            value: 'apply',
            controlName: 'controlName',
            changeType: 'propertyChange'
        };

        // act
        await applyChange(testOptions, change);

        // assert
        expect(CommandFactory.getCommandFor).toBeCalledWith(
            control,
            'Property',
            {
                generator: flexSettings.generator,
                propertyName: change.propertyName,
                newValue: change.value
            },
            null,
            flexSettings
        );
        expect(pushAndExecuteMock).toBeCalledWith(mockCommand);
    });

    test('applyChange - binding expression', async () => {
        sapCoreMock.byId.mockReturnValueOnce(control);
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'enabled',
            value: '{testModel>enabled}',
            controlName: 'controlName',
            changeType: 'propertyBindingChange'
        };

        // act
        await applyChange(testOptions, change);

        // assert
        expect(CommandFactory.getCommandFor).toBeCalledWith(
            control,
            'BindProperty',
            {
                generator: flexSettings.generator,
                propertyName: change.propertyName,
                newBinding: change.value
            },
            null,
            flexSettings
        );
        expect(pushAndExecuteMock).toBeCalledWith(mockCommand);
    });

    test('applyChange - undefined control', async () => {
        sapCoreMock.byId.mockReturnValueOnce(undefined);
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'enabled',
            value: 'false',
            controlName: 'controlName',
            changeType: 'propertyChange'
        };

        // act
        await applyChange(testOptions, change);

        // assert
        expect(pushAndExecuteMock).not.toBeCalled();
    });
});
