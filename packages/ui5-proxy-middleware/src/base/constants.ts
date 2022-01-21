export const HTML_MOUNT_PATHS = ['/index.html', '/**/flpSandbox.html', '/**/flpSandboxMockServer.html'];
export const BOOTSTRAP_REGEX = /(<script\s*[^>]*src="[\/{0,1}|\/{0,1}\.\.\/]*resources\/sap-ui-core\.js"[^>]*)>/;
export const BOOTSTRAP_LINK = 'resources/sap-ui-core.js';
export const BOOTSTRAP_REPLACE_REGEX = /src="[\/{0,1}|\/{0,1}\.\.\/]*resources\/sap-ui-core\.js"/;
export const SANDBOX_REGEX =
    /(<script\s*[^>]*src="[\/{0,1}|\/{0,1}\.\.\/]*test-resources\/sap\/ushell\/bootstrap\/sandbox\.js"[^>]*)>/;
export const SANDBOX_LINK = 'test-resources/sap/ushell/bootstrap/sandbox.js';
export const SANDBOX_REPLACE_REGEX =
    /src="[\/{0,1}|\/{0,1}\.\.\/]*test-resources\/sap\/ushell\/bootstrap\/sandbox\.js"/;
