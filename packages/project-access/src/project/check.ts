import { join } from 'path';
import { findFioriArtifacts } from "./search";

async function test(parallel: boolean){
    const start = Date.now(); 
    await findFioriArtifacts({wsFolders: [join(__dirname, "..", "..", "test", "test-data", "project", "find-all-apps")], artifacts: ["applications"]}, parallel); 
    console.log(parallel ? "Parallel," : "Sequential,",  Date.now() - start);
}

test(true);