import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';

import {
    SimpleQuickAction,
    quickActionListChanged,
    executeQuickAction
} from '@sap-ux-private/control-property-editor-common';

import type { ChangeService } from '../../../../src/cpe/changes/service';
import { QuickActionService } from '../../../../src/cpe/quick-actions/quick-action-service';
import { OutlineService } from '../../../../src/cpe/outline/service';
import {
    QuickActionActivationContext,
    QuickActionContext,
    QuickActionDefinitionGroup,
    SimpleQuickActionDefinition
} from 'open/ux/preview/client/cpe/quick-actions/quick-action-definition';
import { QuickActionDefinitionRegistry } from 'open/ux/preview/client/cpe/quick-actions/registry';

class MockDefinition implements SimpleQuickActionDefinition {
    readonly kind = 'simple';
    readonly type = 'MOCK_DEFINITION';
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }
    isApplicable = false;
    constructor(private context: QuickActionContext) {}
    getActionObject(): SimpleQuickAction {
        return {
            kind: this.kind,

            id: this.id,
            enabled: this.isApplicable,
            title: 'Mock Action'
        };
    }
    initialize(): void {
        this.isApplicable = true;
    }
    execute(): FlexCommand[] {
        return [
            {
                id: 'mock command'
            } as unknown as FlexCommand
        ];
    }

    runEnablementValidators(): void | Promise<void> {}
}

class MockRegistry extends QuickActionDefinitionRegistry<string> {
    getDefinitions(_context: QuickActionActivationContext): QuickActionDefinitionGroup[] {
        return [
            {
                key: 'mock',
                title: 'mock',
                view: jest.fn() as any,
                definitions: [MockDefinition]
            }
        ];
    }
}

const mockChangeService = {
    syncOutlineChanges: jest.fn()
} as unknown as ChangeService;

describe('quick action service', () => {
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock;

    beforeEach(() => {
        sendActionMock = jest.fn();
        subscribeMock = jest.fn();
    });

    test('initialize simple action definition', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
        const registry = new MockRegistry();
        const service = new QuickActionService(rtaMock, new OutlineService(rtaMock, mockChangeService), [registry], {
            onStackChange: jest.fn()
        } as any);
        await service.init(sendActionMock, subscribeMock);

        await service.reloadQuickActions({});

        expect(sendActionMock).toHaveBeenCalledWith(
            quickActionListChanged([
                {
                    title: 'mock',
                    actions: [
                        {
                            'kind': 'simple',
                            id: 'mock-MOCK_DEFINITION',
                            title: 'Mock Action',
                            enabled: true
                        }
                    ]
                }
            ])
        );

        await subscribeMock.mock.calls[0][0](executeQuickAction({ id: 'mock-MOCK_DEFINITION', kind: 'simple' }));
        expect(rtaMock.getCommandStack().pushAndExecute).toHaveBeenCalledWith({
            id: 'mock command'
        });
    });

    test('initialize simple action and react onStackChange', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring;
        const registry = new MockRegistry();
        const onStackChangeMock = {
            onStackChange: jest.fn()
        } as any;
        const outlineService = new OutlineService(rtaMock, mockChangeService);
        const onOutlineChangeCbSpy = jest.spyOn(outlineService, 'onOutlineChange');
        const service = new QuickActionService(rtaMock, outlineService, [registry], onStackChangeMock);
        await service.init(sendActionMock, subscribeMock);
        const reloadQuickActions = jest.spyOn(service, 'reloadQuickActions');
        const controlIndex = {
            filterBar: [
                {
                    controlId: 'filterBar-1v4',
                    children: [],
                    controlType: 'control.FilterBar',
                    editable: true,
                    name: 'test',
                    visible: true
                }
            ]
        };
        onOutlineChangeCbSpy.mock.calls[0][0]({
            detail: { controlIndex }
        } as any);
        onStackChangeMock.onStackChange.mock.calls[0][0]();
        expect(reloadQuickActions).toHaveBeenNthCalledWith(2, controlIndex);
    });
});
