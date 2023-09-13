import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import init from '../cpe/init';
import log from 'sap/base/Log';

export default function(rta: RuntimeAuthoring) {
    // custom adaptation project plugin code goes here
    log.debug('ADP init executed.');
    // also initialize the editor
    init(rta);
}