import FragmentDialog from './dialogs/fragment';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

export default (rta: RuntimeAuthoring) => {
    const contextMenu = rta.getDefaultPlugins().contextMenu;

    const fragmentDialog = new FragmentDialog(rta);

    fragmentDialog.init(contextMenu);
};
