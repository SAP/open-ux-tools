# Why are some file shimmed ?

## crossroads, hasher, jquery.sap.stubs, jquery-mobile-custom

Need to be shimmed because they behave differently in a node environment otherwise

## caja-html-sanitizer

Incorrect character sequence that make babel unhappy when runnning in jest

## ThemeCheck

Because it just doesn't stop properly and we also don't care