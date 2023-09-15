import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import init from '../cpe/init';
import { initController } from './dialogs/controller';
import { initFragment } from './dialogs/fragment';

export default function (rta: RuntimeAuthoring) {
    // initialize fragment content menu entry
    initFragment(rta);
    initController(rta);
    // also initialize the editor
    init(rta);
    log.debug('ADP init executed.');
}
