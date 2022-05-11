module.exports = function (config) {
  config.set({

    frameworks: ["ui5"],

    ui5: {
      configPath: "ui5-mock.yaml"
    },

    browsers: ["Chrome"]

  });
};