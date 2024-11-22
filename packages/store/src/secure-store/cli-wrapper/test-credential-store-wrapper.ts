import { ToolsLogger } from '@sap-ux/logger';
import { CredentialStoreWrapper } from './cli-key-store';

const log = new ToolsLogger();
const store = new CredentialStoreWrapper(log);

(async () => {
    const service = 'test-service';
    const key1 = 'test-key1';
    const value1 = { username: 'user1', password: 'pass1' };
    const key2 = 'test-key2';
    const value2 = { username: 'user2', password: 'pass2' };

    // Save
    const saveResult1 = await store.save(service, key1, value1);
    console.log('Save Result:', saveResult1 ? 'Success' : 'Failed');

    const saveResult2 = await store.save(service, key2, value2);
    console.log('Save Result:', saveResult2 ? 'Success' : 'Failed');

    // Retrieve
    const retrievedValue1 = await store.retrieve(service, key1);
    console.log('Retrieved Value:', retrievedValue1);

    const retrievedValue2 = await store.retrieve(service, key2);
    console.log('Retrieved Value:', retrievedValue2);

    // Get All
    const allCredentials = await store.getAll(service);
    console.log('All Credentials:', JSON.stringify(allCredentials, null, 2));

    // Delete
    const deleteResult1 = await store.delete(service, key1);
    console.log('Delete Result:', deleteResult1 ? 'Success' : 'Failed');

    const deleteResult2 = await store.delete(service, key2);
    console.log('Delete Result:', deleteResult2 ? 'Success' : 'Failed');
})();
