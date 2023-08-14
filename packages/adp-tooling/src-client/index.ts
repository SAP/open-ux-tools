import { showDialog } from "./submodule/dialog.js";

export default (rta: sap.ui.rta.RuntimeAuthoring) => {
    const menu = rta.getDefaultPlugins().contextMenu;
    menu.addMenuItem({
        id: 'ADD_ACTION',
        text: 'Show dialog',
        handler: () => showDialog(),
        icon: 'sap-icon://attachment-html'
    });
}

