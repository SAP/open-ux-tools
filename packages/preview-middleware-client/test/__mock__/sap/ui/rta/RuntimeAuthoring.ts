import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

const RuntimeAuthoringMock = {
    getDefaultPlugins: jest.fn(),
    getService: jest.fn(),
    getCommandStack: jest.fn(),
    getFlexSettings: jest.fn()
};

export default RuntimeAuthoringMock as unknown as RuntimeAuthoring & typeof RuntimeAuthoringMock;