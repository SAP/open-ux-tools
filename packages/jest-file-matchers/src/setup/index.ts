import * as matchers from '../matchers/index.js';

if (expect === undefined) {
    throw new Error("Cannot find Jest's global expect. Check if you have correctly installed the matchers");
} else {
    expect.extend(matchers);
}
