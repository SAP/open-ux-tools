# Why are some file shimmed ?

## ui5loader

Because we need an own loader for ui5 files based on `require` and not `fetch` statements

## The rest

Need to be shimmed because they behave differently in a node environment otherwise, this is due to the fact that the dependencies that ui5 use were made to run differently in node environment and nodes ones.
The main change is replacing `this` with `window` in some case as in browsers this is the expected behavior for script files.

