import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { initController } from './dialogs/controller';
import { initFragment } from './dialogs/fragment';

export default (rta: RuntimeAuthoring) => {
    initFragment(rta);
    initController(rta);
};
