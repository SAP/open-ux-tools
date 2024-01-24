import RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type { RTAPlugin } from 'sap/ui/rta/api/startAdaptation';

export default async function (options: any, loadPlugins: RTAPlugin) {
    const rta = new RuntimeAuthoring(options);

    const fnOnStop = function () {
        rta.destroy();
    };

    rta.attachEvent('stop', fnOnStop);

    if (loadPlugins) {
        await loadPlugins(rta);
    }

    await rta.start();
}
