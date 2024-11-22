import { ToolsLogger } from "@sap-ux/logger";
import { SecureKeyStoreManager } from "./zowe-sdk-store";

(async () => {
    const logger = new ToolsLogger();
    const keyStore = new SecureKeyStoreManager(logger);

    const service = "testService";
    const account = "testAccount";
    const value = { username: "user123", password: "pass123" };

    // Save value
    const saveSuccess = await keyStore.save(service, account, value);
    console.log("Save successful:", saveSuccess);

    // Retrieve value
    const retrievedValue = await keyStore.retrieve(service, account);
    console.log("Retrieved value:", retrievedValue);

    // GetAll operation
    const allValues = await keyStore.getAll(service);
    console.log("All values:", allValues);

    // Delete value
    const deleteSuccess = await keyStore.delete(service, account);
    console.log("Delete successful:", deleteSuccess);
})();
