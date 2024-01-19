const { update } = require("../../../dist/test/unit/helper/update-test-data");
update('csv')
  .then(() => console.log("Csv tests updated"))
  .catch(console.error);
