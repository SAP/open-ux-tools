// Manual mock for @sap-ux/guided-answers-helper

export const GUIDED_ANSWERS_EXTENSION_ID = 'sap.sap-guided-answers-extension';
export const GUIDED_ANSWERS_LAUNCH_CMD_ID = 'sap.ux.guidedAnswer.openGuidedAnswer';

export const HELP_TREE = {
    FIORI_TOOLS: 3046
};

export const HELP_NODES = {
    FIORI_TOOLS_SYSTEM_CONNECTION_ISSUES: 35317
};

export const getHelpUrl = jest.fn((treeId: number, nodeId: number) => {
    return `https://help.sap.com/guided-answers/${treeId}/${nodeId}`;
});
