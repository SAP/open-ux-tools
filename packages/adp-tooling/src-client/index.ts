import FragmentDialog from './fragment/fragment';

export default (rta: sap.ui.rta.RuntimeAuthoring) => {
    const contextMenu = rta.getDefaultPlugins().contextMenu;

    const fragmentDialog = new FragmentDialog(rta);

    fragmentDialog.init(contextMenu);
};
