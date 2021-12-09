import v2services from './abap/mockResponses/v2ServiceCollection.json';
import fs from 'fs';
import path from 'path';

const results = v2services.d.results.map((element) => {
    delete element.Author;
    return element;
});
fs.writeFileSync(
    path.join(__dirname, './abap/mockResponses/v2ServiceCollection.json'),
    JSON.stringify({ d: { results } }, null, 4)
);
