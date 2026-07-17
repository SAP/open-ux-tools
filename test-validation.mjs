#!/usr/bin/env node

// Test script to verify system name validation
import { getService } from '@sap-ux/store';

async function testSystemValidation() {
    console.log('🧪 Testing System Name Validation\n');

    try {
        // Import after mocking if needed
        const { isSystemNameTaken } =
            await import('./packages/inquirer-common/dist/validators/system-name-validator.js');

        console.log('✅ Successfully imported isSystemNameTaken');

        // Get existing systems
        const service = await getService({ entityName: 'system' });
        const allSystems = await service.getAll({
            backendSystemFilter: {
                connectionType: ['abap_catalog', 'odata_service', 'generic_host']
            }
        });

        console.log(`\n📊 Found ${allSystems.length} existing systems in store`);
        allSystems.forEach((sys) => {
            console.log(`   - ${sys.name} (${sys.connectionType})`);
        });

        // Test 1: Check non-existent name
        console.log('\n🧪 Test 1: Check non-existent system name');
        const test1 = await isSystemNameTaken('NonExistentSystem12345');
        console.log(`   Result: ${test1} (expected: false)`);
        console.log(test1 === false ? '   ✅ PASS' : '   ❌ FAIL');

        // Test 2: Check case-insensitive matching
        if (allSystems.length > 0) {
            const existingName = allSystems[0].name;
            console.log(`\n🧪 Test 2: Check case-insensitive matching`);
            console.log(`   Existing system: "${existingName}"`);
            const test2a = await isSystemNameTaken(existingName.toLowerCase());
            const test2b = await isSystemNameTaken(existingName.toUpperCase());
            console.log(`   Lowercase result: ${test2a} (expected: true)`);
            console.log(`   Uppercase result: ${test2b} (expected: true)`);
            console.log(test2a === true && test2b === true ? '   ✅ PASS' : '   ❌ FAIL');
        }

        // Test 3: Check trimming
        if (allSystems.length > 0) {
            const existingName = allSystems[0].name;
            console.log(`\n🧪 Test 3: Check name trimming`);
            const test3 = await isSystemNameTaken(`  ${existingName}  `);
            console.log(`   Result with spaces: ${test3} (expected: true)`);
            console.log(test3 === true ? '   ✅ PASS' : '   ❌ FAIL');
        }

        // Test 4: Check connection type filtering
        console.log(`\n🧪 Test 4: Check connection type filtering`);
        const test4 = await isSystemNameTaken('TestName', {
            connectionTypes: ['abap_catalog']
        });
        console.log(`   Filtered to abap_catalog only: ${test4}`);
        console.log('   ✅ Function accepts connection type filtering');

        // Test 5: Check excludeSystem option
        if (allSystems.length > 0) {
            const existingSystem = allSystems[0];
            console.log(`\n🧪 Test 5: Check excludeSystem option`);
            const test5 = await isSystemNameTaken(existingSystem.name, {
                excludeSystem: existingSystem
            });
            console.log(`   Result with excludeSystem: ${test5} (expected: false for same system)`);
            console.log(test5 === false ? '   ✅ PASS' : '   ❌ FAIL');
        }

        console.log('\n✅ All tests completed!\n');
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testSystemValidation();
