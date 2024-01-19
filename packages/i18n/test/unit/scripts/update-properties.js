const { update } = require("../../../dist/test/unit/helper/update-test-data");
update('properties')
  .then(() => console.log("Properties tests updated"))
  .catch(console.error);
