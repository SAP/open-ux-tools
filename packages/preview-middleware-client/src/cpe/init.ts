import log from 'sap/base/Log';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

export default function(rta: RuntimeAuthoring) {
    // custom rta plugin code goes here
    log.debug(`Editor start with following settings: ${rta.getFlexSettings()}}`);
}