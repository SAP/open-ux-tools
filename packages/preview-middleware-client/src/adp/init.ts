import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import init from '../cpe/init';

export default function(rta: RuntimeAuthoring) {
    // custom adaptation project plugin code goes here
    // also initialize the editor
    init(rta);
}