import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import init from '../cpe/init';
import { initDialogs } from './init-dialogs';

export default function (rta: RuntimeAuthoring) {
    // initialize fragment content menu entry
    initDialogs(rta);
    // also initialize the editor
    init(rta);
    log.debug('ADP init executed.');
}
