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
    isActive = false;
    constructor(private context: QuickActionContext) {}
    getActionObject(): SimpleQuickAction {
        return {
            kind: this.kind,

            id: this.id,
            enabled: this.isActive,
            title: 'Mock Action'
        };
    }
    initialize(): void {
        this.isActive = true;
    }
    execute(): FlexCommand[] {
        return [
            {
                id: 'mock command'
            } as unknown as FlexCommand
        ];
    }
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
        const service = new QuickActionService(rtaMock, new OutlineService(rtaMock, mockChangeService), [registry]);
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
});
