import type { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

class RuntimeAuthoringMock {
    constructor(_: RTAOptions) {}
    public getDefaultPlugins = jest.fn();
    public getService = jest.fn();
    public getCommandStack = jest.fn().mockReturnValue({
        pushAndExecute: jest.fn()
    });
    public getSelection = jest.fn().mockReturnValue([{ setSelected: jest.fn() }, { setSelected: jest.fn() }]);
    public getFlexSettings = jest.fn().mockReturnValue({});
    public attachEvent = jest.fn();
    public destroy = jest.fn();
    public start = jest.fn();
    public attachStop = jest.fn();
    public stop = jest.fn();
    public attachUndoRedoStackModified = jest.fn();
    public attachModeChanged = jest.fn();
    public attachSelectionChange = jest.fn().mockImplementation((newHandler: (event: Event) => Promise<void>) => {
        return newHandler;
    });
    public setPlugins = jest.fn();
    public canUndo = jest.fn();
    public canRedo = jest.fn();
    public canSave = jest.fn();
    public setMode = jest.fn();
    public undo = jest.fn();
    public redo = jest.fn();
    public save = jest.fn();
    public getRootControlInstance = jest.fn().mockReturnValue({
        getManifest: jest.fn().mockReturnValue({})
    });
    public _serializeToLrep = jest.fn();
}

export default RuntimeAuthoringMock as unknown as RuntimeAuthoring & typeof RuntimeAuthoringMock;
