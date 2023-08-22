import FragmentDialog from './dialogs/fragment';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type { BaseDialog } from './dialogs/base';

export default (rta: RuntimeAuthoring) => {
    const contextMenu = rta.getDefaultPlugins().contextMenu;

    const fragmentDialog = new FragmentDialog(rta);

    const dialogs: BaseDialog[] = [fragmentDialog];

    for (const menuItem of dialogs) {
        menuItem.init(contextMenu);
    }
};
