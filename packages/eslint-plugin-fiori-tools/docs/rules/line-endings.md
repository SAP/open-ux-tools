# Detect usage of invalid line endings (line-endings)

Different operating systems usually represent a newline with different characters, for details see here.

For example Windows uses CR+LF (carriage return and line-feed characters) whereas Unix only uses the LF character.

Mixed kinds of line-endings in the same repository can cause code reviews or automatic merging to be .

## Rule Details

This check will raise a warning when "Windows line endings" (CR + LF character) are detected. Please change lo Unix style line endings.
