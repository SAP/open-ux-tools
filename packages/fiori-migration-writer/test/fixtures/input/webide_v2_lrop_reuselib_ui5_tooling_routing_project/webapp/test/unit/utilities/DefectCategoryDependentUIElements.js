/*global QUnit*/

sap.ui.define(
    [
        'i2d/qm/defect/records1/ext/utilities/DefectCategoryDependentUIElements',
        'sap/ui/thirdparty/sinon',
        'sap/ui/thirdparty/sinon-qunit'
    ],
    function (DefcatDepUIElms, Sinon) {
        'use strict';

        QUnit.module('Utilities - Defect Category dependent UI Elements', {
            beforeEach: function () {
                // Initialize array
                DefcatDepUIElms.aDependentUIElements = [];
            },
            afterEach: function () {}
        });

        /************************************************************************************************************************************/
        //=== QUnit tests for method _addDependentUIElementId
        QUnit.test('_addDependentUIElementId - Push new entry to array of UI element IDs', function (assert) {
            // Given

            // When - Execute test
            DefcatDepUIElms._addDependentUIElementId(
                'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--Zext_Z1_CustomSection1::Section'
            );
            // Then - Evaluate
            assert.strictEqual(DefcatDepUIElms.aDependentUIElements.length, 1);
            assert.strictEqual(
                DefcatDepUIElms.aDependentUIElements[0].UIElementId,
                'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--Zext_Z1_CustomSection1::Section'
            );
            assert.strictEqual(DefcatDepUIElms.aDependentUIElements[0].DefectCategory, 'Z1');
        });

        QUnit.test('_addDependentUIElementId - No new entry in array of UI element IDs', function (assert) {
            // Given

            // When - Execute test
            DefcatDepUIElms._addDependentUIElementId(
                'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--StandardSection1::Section'
            );
            // Then - Evaluate
            assert.strictEqual(DefcatDepUIElms.aDependentUIElements.length, 0);
        });
        /************************************************************************************************************************************/
        //=== QUnit tests for method collectDependentUIElements
        QUnit.test(
            'collectDependentUIElements - All UI elements that depend on a defect category get a new property binding set',
            function (assert) {
                // Given
                //-- mock for oView (and all assertions, too)
                var oViewMock = {
                    setModel: function (model, name) {
                        assert.strictEqual(name, 'dependentUIElements');
                    },
                    byId: function (id) {
                        if (
                            id ===
                            'i2d.qm.defect.records1::sap.suite.ui.generic.template.ObjectPage.view.Details::C_DefectRecord--objectPage'
                        ) {
                            return {
                                getSections: function () {
                                    return [
                                        {
                                            getId: function () {
                                                return 'zext_Z1_id_section1::Section';
                                            }
                                        }
                                    ];
                                }
                            };
                        } else if (id === 'zext_Z1_id_section1::Form') {
                            return {
                                getGroups: function () {
                                    return [
                                        {
                                            getId: function () {
                                                return 'zext_Z1_id_group1::FormGroup';
                                            }
                                        }
                                    ];
                                }
                            };
                        } else if (id === 'zext_Z1_id_section1::Section') {
                            return {
                                bindProperty: function (property, bindingInfo) {
                                    assert.strictEqual(property, 'visible');
                                    assert.strictEqual(bindingInfo.parts[0].path, 'DefectCategory');
                                    assert.strictEqual(
                                        bindingInfo.parts[1].path,
                                        'dependentUIElements>/0/DefectCategory'
                                    );
                                }
                            };
                        } else if (id === 'zext_Z1_id_group1::FormGroup') {
                            return {
                                bindProperty: function (property, bindingInfo) {
                                    assert.strictEqual(property, 'visible');
                                    assert.strictEqual(bindingInfo.parts[0].path, 'DefectCategory');
                                    assert.strictEqual(
                                        bindingInfo.parts[1].path,
                                        'dependentUIElements>/1/DefectCategory'
                                    );
                                }
                            };
                        }
                    }
                };

                // When
                DefcatDepUIElms.collectDependentUIElements(oViewMock);
                // Then
                // all needed assertions are in oViewMock
            }
        );
        /************************************************************************************************************************************/
    }
);
