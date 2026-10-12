---
"@sap-ux/ui5-test-writer": minor
---

FEAT: Generate the List Report text-annotation OPA tests ("Check the Sort options for columns with a Text annotation" and "Check the presence of the text columns for columns with a Text annotation") for multi-table (Multiple Table Mode) List Reports, emitting a per-view test for each tab. Also rename these tests (previously "Check text annotation for columns" / "Check columns in adaptation dialog"), exclude columns bound through a navigation property (association fields are not sortable or adaptable), and keep a column whose text target is reached via a navigation property while skipping the (unsortable) text-property assertion.
