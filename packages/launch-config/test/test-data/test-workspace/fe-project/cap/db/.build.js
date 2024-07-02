// Executes the CDS build depending on whether we have a top-level package.json.
// Package.json is not available when we are called by CF/XSA buildpack.  In this case we don't do anything
// and just assume our model was already built and is available as part of this DB app.
//
// This is a workaround that will be replaced by a solution where CDS generates the DB module along with package.json.

const fs = require('fs');
const childproc = require('child_process');

if (fs.existsSync('../package.json')) {
    // true at build-time, false at CF staging time
    childproc.execSync('npm install && npm run build', {
        cwd: '..',
        stdio: 'inherit'
    });
}
