# NAME

write - write text to file from stdin

## SYNOPSIS

`write <file>`

## DESCRIPTION

Write text content to a file. Prompts for input line by line. Enter a blank line to finish and save the file.

Useful for quickly creating files with text content without opening the editor.

## EXAMPLES

Write to a file:
```
write notes.txt
```

Then type lines of text, pressing Enter after each line. Press Enter on a blank line to finish.

Write to a script:
```
write /home/script.js
```

## SEE ALSO

vein(1), cat(1), touch(1), echo(1)
