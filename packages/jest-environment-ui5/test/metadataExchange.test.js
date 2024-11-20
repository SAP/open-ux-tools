const {storeTestMetadata, getTestMetadata} = require("../src/metadataExchange");
const fs = require('fs');
describe("MetadataExchange", () => {
    it("Store references for tests", () => {
        fs.mkdirSync("reports");
        const references = {references: {
                type: "something",
                ID: "uxengtools-2"
            }
        }
        storeTestMetadata("Add a reference to a normal test run", references);
        expect(getTestMetadata("Add a reference to a normal test run")).toEqual(references);
        fs.rmSync("reports", {recursive: true});
    })
});