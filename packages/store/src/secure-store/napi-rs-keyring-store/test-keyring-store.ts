import { ToolsLogger } from "@sap-ux/logger";
import { SecureKeyStoreManager } from "./keyring-store";

(async () => {
    const log = new ToolsLogger();
    const keyStore = new SecureKeyStoreManager(log);

    const service = 'exampleService';
    const key = 'exampleKey';
    const value = { foo: 'bar' };

    // Save a value
    await keyStore.save(service, key, value);

    // Retrieve the value
    const retrievedValue = await keyStore.retrieve(service, key);
    console.log('Retrieved:', retrievedValue);

    // Retrieve all values for the service
    const allValues = await keyStore.getAll(service);
    console.log('All values:', allValues);

    // Delete the value
    await keyStore.delete(service, key);
})();
