# Testing Guidelines
**Referencing inquirer prompts in tests**
- Dont use indexes to reference prompts from arrays, unless the test is specifically relating to prompt ordering. Instead use the prompt name and `find`. This makes the tests more robust and easier for humans to understand.