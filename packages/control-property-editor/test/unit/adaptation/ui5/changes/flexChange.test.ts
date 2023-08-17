import { applyChange } from '../../../../../src/adaptation/ui5/changes/flexChange';
import type { UI5AdaptationOptions } from '../../../../../src/adaptation/ui5/types';
import type { PropertyChange } from '../../../../../src/api';
describe('flexChange', () => {
    // prepare
    global.sap = {
        ui: {
            getCore: jest
                .fn()
                .mockReturnValueOnce({
                    byId: jest.fn().mockReturnValueOnce({ name: 'sap.m.Button' })
                })
                .mockReturnValueOnce({
                    byId: jest.fn().mockReturnValueOnce({ name: 'sap.m.Button' })
                })
                .mockReturnValueOnce({
                    byId: jest.fn().mockReturnValueOnce({ name: 'sap.m.Button' })
                })
                .mockReturnValueOnce({
                    byId: jest.fn().mockReturnValueOnce(undefined)
                }),
            rta: {
                command: {
                    CommandFactory: {
                        getCommandFor: jest
                            .fn()
                            .mockResolvedValueOnce({
                                getPreparedChange: jest.fn().mockReturnValue({
                                    getDefinition: jest.fn().mockReturnValue({
                                        support: {
                                            generator: 'testGenerator'
                                        }
                                    })
                                })
                            })
                            .mockResolvedValueOnce({
                                getPreparedChange: jest.fn().mockReturnValue({
                                    getDefinition: jest.fn().mockReturnValue({
                                        support: {
                                            generator: 'testGenerator'
                                        }
                                    })
                                })
                            })
                            .mockResolvedValueOnce({
                                getPreparedChange: jest.fn().mockReturnValue({
                                    getDefinition: jest.fn().mockReturnValue({
                                        support: {
                                            generator: 'testGenerator'
                                        }
                                    })
                                })
                            })
                    } as sap.ui.rta.command.CommandFactory
                }
            }
        }
    };
    let getCommandStackMock: jest.Mock;
    let pushAndExecuteMock: jest.Mock;
    let options: UI5AdaptationOptions;

    beforeEach(() => {
        getCommandStackMock = jest.fn();
        pushAndExecuteMock = jest.fn();
        options = {
            rta: {
                getCommandStack: getCommandStackMock.mockReturnValueOnce({
                    pushAndExecute: pushAndExecuteMock.mockImplementationOnce(async () => {
                        return;
                    })
                })
            } as any,
            generator: 'testGenerator',
            componentId: 'testComponentId',
            layer: 'VENDOR'
        };
    });
    test('createUi5Facade - nonBindProperty', async () => {
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'blocked',
            value: false,
            controlName: 'controlName'
        };

        // act
        await applyChange(options, change);

        // assert
        expect(getCommandStackMock).toBeCalledTimes(1);
        expect(pushAndExecuteMock).toBeCalledTimes(1);
    });

    test('createUi5Facade - BindProperty', async () => {
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'enabled',
            value: '{testModel>enabled}',
            controlName: 'controlName'
        };

        // act
        await applyChange(options, change);

        // assert
        expect(getCommandStackMock).toBeCalledTimes(1);
        expect(pushAndExecuteMock).toBeCalledTimes(1);
    });

    test('createUi5Facade - string', async () => {
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'enabled',
            value: 'false',
            controlName: 'controlName'
        };

        // act
        await applyChange(options, change);

        // assert
        expect(getCommandStackMock).toBeCalledTimes(1);
        expect(pushAndExecuteMock).toBeCalledTimes(1);
    });

    test('createUi5Facade - string', async () => {
        const change: PropertyChange = {
            controlId: 'testId',
            propertyName: 'enabled',
            value: 'false',
            controlName: 'controlName'
        };

        // act
        await applyChange(options, change);
    });
});
