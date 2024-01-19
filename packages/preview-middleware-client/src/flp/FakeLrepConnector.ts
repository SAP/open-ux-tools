import FakeLrepConnector from 'sap/ui/fl/FakeLrepConnector';

const path = '/preview/api/changes';

// @ts-ignore
jQuery.extend(FakeLrepConnector.prototype, {
    loadChanges: async function () {
        const response = await fetch(path, {
            method: 'GET',
            headers: {
                'content-type': 'application/json'
            }
        });
        const changes = await response.json();
        return changes;
    },
    loadSettings: function () {
        return Promise.resolve();
    }
});

FakeLrepConnector.enableFakeConnector();
// @ts-ignore
FakeLrepConnector.loadFlexData = async function () {
    return { variants: [] };
};

export default FakeLrepConnector;
// // @ts-ignore
// sap.ui.fl.LrepConnector.loadFlexData = () => {};
