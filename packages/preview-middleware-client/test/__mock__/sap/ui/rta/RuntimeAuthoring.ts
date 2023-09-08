import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

const RuntimeAuthoringMock = {
    getService: jest.fn(),
    getCommandStack: jest.fn()
};

export default RuntimeAuthoringMock as unknown as RuntimeAuthoring & typeof RuntimeAuthoringMock;