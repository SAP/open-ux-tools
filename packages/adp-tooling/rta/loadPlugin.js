export default (rta) => {
    const menu = rta.getDefaultPlugins().contextMenu;
    menu.addMenuItem({
        id: 'ADD_FRAGMENT',
        text: 'Add: Fragment',
        handler: () => alert(),
        icon: 'sap-icon://attachment-html'
    });
}

