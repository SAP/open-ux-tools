// This file  can be used to verify the transpiled code runs correctly
const getService = require('../../dist/index.js').getService;
const BackendSystem = require('../../dist/index.js').BackendSystem;
const BackendSystemKey = require('../../dist/index.js').BackendSystemKey;

async function main(action) {
    const systemService = await getService({
        logger: console,
        entityName: 'system',
        options: { baseDirectory: 'foo' }
    });

    const sys1 = new BackendSystem({
        name: 'sys10',
        url: 'http://sys1',
        username: 'foo',
        password: 'foobar1'
    });
    const sys2 = new BackendSystem({
        name: 'sys2',
        url: 'http://sys2',
        username: 'foo',
        password: 'foobar2'
    });
    const sys3 = new BackendSystem({
        name: 'sys3',
        url: 'http://sys3',
        username: 'foo',
        password: 'foobar3'
    });
    if (action === 'w') {
        await systemService.write(sys3);

        await systemService.write(sys2);

        await systemService.write(sys1);
    } else if (action === 'r') {
        const key = new BackendSystemKey({ url: 'http://sys1' });
        console.dir(await systemService.read(key));
    } else if (action === 'd') {
        console.dir(await systemService.delete(sys1));
        console.dir(await systemService.delete(sys2));
        console.dir(await systemService.delete(sys3));
    } else if (action === 'a') {
        console.dir(await systemService.getAll());
    }

    console.dir(action);
}

if (require.main === module) {
    main(process.argv[2] || 'a');
}
