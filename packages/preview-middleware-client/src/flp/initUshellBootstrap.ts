import VersionInfo from 'sap/ui/VersionInfo';

export default async function initUshellBootstrap(): Promise<void> {
    const { version } = (await VersionInfo.load()) as { version: string };
    const major = version ? parseInt(version.split('.')[0], 10) : 2;
    if (major >= 2) {
        sap.ui.require.toUrl('../resources/sap/ushell/bootstrap/sandbox2.js');
    } else {
        sap.ui.require.toUrl('../test-resources/sap/ushell/bootstrap/sandbox.js');
    }
}
