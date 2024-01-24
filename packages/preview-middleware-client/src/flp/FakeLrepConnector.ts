import FakeLrepConnector from 'sap/ui/fl/FakeLrepConnector';
import LrepConnector from 'sap/ui/fl/LrepConnector';

interface FlexChange {
    [key: string]: string | object | undefined;
    support: {
        generator?: string;
    };
}

interface FetchedChanges {
    [key: string]: FlexChange;
}

interface LoadChangesResult {
    changes: {
        loadModules: boolean;
        changes: FlexChange[];
        settings: {
            [key: string]: string | boolean | undefined;
        };
    };
    componentClassName: string;
    etag: string;
    loadModules: boolean;
    messagebundle: string | undefined;
}

const path = '/preview/api/changes';

function getFlexSettings() {
    let result;
    const bootstrapConfig = document.getElementById('sap-ui-bootstrap');
    const flexSetting = bootstrapConfig?.getAttribute('data-open-ux-preview-flex-settings');
    if (flexSetting) {
        result = JSON.parse(flexSetting);
    }
    return result;
}

export async function create(changeArr: FlexChange[]) {
    const settings = getFlexSettings();
    await Promise.all(
        changeArr.map(async (change) => {
            if (settings) {
                change.support ??= {};
                change.support.generator = settings.generator;
            }

            await fetch(path, {
                method: 'POST',
                body: JSON.stringify(change, null, 2),
                headers: {
                    'content-type': 'application/json'
                }
            });
        })
    );
}

export async function loadChanges() {
    const lrep = new LrepConnector();

    const response = await fetch(path, {
        method: 'GET',
        headers: {
            'content-type': 'application/json'
        }
    });
    const changes = (await response.json()) as FetchedChanges;

    return LrepConnector.prototype.loadChanges
        .apply(lrep, arguments as unknown as any)
        .then((res: LoadChangesResult) => {
            const arr: FlexChange[] = [];
            Object.entries(changes).forEach(([_, val]) => {
                arr.push(val);
            });
            res.changes.changes = arr;
            return res;
        });
}

export default function () {
    // @ts-ignore
    const version = sap.ui.version;
    const minor = version.split(/[.-]/)[1];

    if (minor < 72) {
        // @ts-ignore
        jQuery.extend(FakeLrepConnector.prototype, {
            create,
            loadChanges,
            loadSettings: () => Promise.resolve()
        });

        FakeLrepConnector.enableFakeConnector();
    }
}
