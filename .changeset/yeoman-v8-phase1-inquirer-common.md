---
"@sap-ux/inquirer-common": minor
---

FEAT: Rework the prompt type foundation onto inquirer 13 as the first step of the yeoman-generator 8 upgrade. `YUIQuestion` and the specific question types (`InputQuestion`, `PasswordQuestion`, `ListQuestion`, etc.) are now derived from inquirer 13's `DistinctQuestion` so they remain assignable to `yeoman-generator`'s `this.prompt(...)` without casting. The former inquirer 8 `ListChoiceOptions` is replaced by a locally defined `ChoiceOptions` type.
