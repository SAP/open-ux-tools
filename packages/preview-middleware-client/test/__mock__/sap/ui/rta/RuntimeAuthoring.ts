import type { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

class RuntimeAuthoringMock {
    constructor(_: RTAOptions) {}
    public getDefaultPlugins = jest.fn();
    public getService = jest.fn();
    public getCommandStack = jest.fn();
    public getFlexSettings = jest.fn().mockReturnValue({});
    public attachEvent = jest.fn();
    public destroy = jest.fn();
    public start = jest.fn();
    public attachStop =  jest.fn();
    public stop = jest.fn();
    public attachUndoRedoStackModified = jest.fn();
    public attachModeChanged = jest.fn();
    public attachSelectionChange = jest.fn();
    public setPlugins = jest.fn();
    public canUndo = jest.fn();
    public canRedo = jest.fn();
    public canSave = jest.fn();
    public setMode = jest.fn();
    public undo = jest.fn();
    public redo = jest.fn();
    public save = jest.fn();
    public _serializeToLrep = jest.fn();
}

export default RuntimeAuthoringMock as unknown as RuntimeAuthoring & typeof RuntimeAuthoringMock;
