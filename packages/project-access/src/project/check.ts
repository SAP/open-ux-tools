import { readFile } from "../file/file-access";
import { findFioriArtifacts } from "./search";

async function test(parallel: boolean, wrap: boolean){
    const start = Date.now();
    await findFioriArtifacts({wsFolders: ["C:\\SAPDevelop\\testProjects\\tools-suite-projects\\"], artifacts: ["applications"]}, parallel, wrap);
    console.log(parallel ? "Parallel," : "Sequential,", wrap ? "with" : "no", "wrapping:", Date.now() - start);
}

test(false, false);