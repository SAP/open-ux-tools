/*eslint-disable*/
QUnit.config.testTimeout = 60000;

// function used for initializing a scaffolding-mocked environment
function mockInfrastructure() {
	var oResourceBundle = function() {
		/*
		 * Warning! This loads the i18n_en.properties file and not the i18n.properties file. However, setting locale to '' does not work, as this
		 * would make sap-ui5 load the properties file of your default locale which is set in your browser configuration (=> even worse!)
		 */
		var realResBundle = jQuery.sap.resources({
			url: "../i18n/i18n.properties",
			locale: 'en'
		});
		var resBundle = {};

		assert.ok(realResBundle !== undefined, "ResourceBundle for i18n.properties needs to exist");
		var testText = realResBundle.getText("FULLSCREEN_TITLE");
		assert.ok(testText !== "FULLSCREEN_TITLE", "Text for FULLSCREEN_TITLE needs to exist / the ResourceBundle can be loaded");
		if (testText === "FULLSCREEN_TITLE") {
			// getting the real ResBundle was not successful, we take a dummy implementation
			resBundle = {
				getText: function(id) {
					return "TextOf(" + id + ")";
				}
			};

			return resBundle;
		}

		// Note: We got the i18n file
		// register spy
		resBundle = {
			getText: function(id) {
				var text = realResBundle.getText.apply(realResBundle, arguments);
				assert.ok(text !== undefined, "The i18n with id '" + id + "' needs to exists in the loaded i18n_en.properties file");

				return text;
			}
		};
		return resBundle;
	}();

	var oImpl = {
		oApplicationImplementation: {
			oConfiguration: {
				oApplicationFacade: {
					getResourceBundle: function() {
						return oResourceBundle;
					}
				}
			},
			oMHFHelper: {
				defineMasterHeaderFooter: function() {
				}
			}
		}
	};
	sap.ca.scfld.md.app.Application = {
		getImpl: function() {
			return oImpl;
		}
	};

	assert.ok(true, '--- Infrastructure has been mocked ---');
}

function getMockResourceBundle() {
	return sap.ca.scfld.md.app.Application.getImpl().oApplicationImplementation.oConfiguration.oApplicationFacade.getResourceBundle();
}

// tests to run
jQuery.sap.require("fin.ar.lineitems.display.test.unit.GlobalTest");
jQuery.sap.require("fin.ar.lineitems.display.test.unit.S1controllerTest");