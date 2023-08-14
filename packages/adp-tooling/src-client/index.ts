import FragmentDialog from './fragment';

export default (rta: sap.ui.rta.RuntimeAuthoring) => {
    const fragmentDialog = new FragmentDialog(rta);
    const menu = rta.getDefaultPlugins().contextMenu;
    
    menu.addMenuItem({
        id: 'ADD_FRAGMENT',
        text: 'Add: Fragment',
        handler: fragmentDialog.handleAddNewFragment,
        icon: 'sap-icon://attachment-html'
    });
};
