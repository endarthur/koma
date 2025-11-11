# schist(1) - Schist Lisp/Scheme Interpreter

## NAME
**schist** - A minimal Lisp/Scheme interpreter for Koma

## SYNOPSIS
```
schist -e "EXPRESSION"
schist FILE.scm
schist --help
```

## DESCRIPTION
Schist is a minimal but complete Lisp/Scheme interpreter built into the Koma shell. Named after the metamorphic rock with layered structure (like nested s-expressions), Schist provides functional programming capabilities and demonstrates the elegance of Lisp's self-describing nature.

With support for `eval` and `apply`, Schist is capable of **metacircular evaluation** - you can write a complete Lisp interpreter in Schist itself, demonstrating the "Maxwell's Equations of Software" concept.

## OPTIONS
**-e** *expression*
:   Evaluate a single Schist expression and print the result

**-i**
:   Interactive REPL mode (Read-Eval-Print Loop)

**--help**
:   Show help message with available functions and special forms

## LANGUAGE FEATURES

### Special Forms
Special forms are evaluated differently from regular function calls:

**quote** *expr* or **'***expr*
:   Return expression without evaluating it
    ```scheme
    (quote (+ 1 2))  ; → (+ 1 2), not 3
    '(+ 1 2)         ; Same thing
    ```

**if** *condition* *then-expr* *else-expr*
:   Conditional evaluation
    ```scheme
    (if (= x 0) 'zero 'non-zero)
    ```

**cond** *(test expr...)* ... **else** *expr...*
:   Multi-way conditional (like switch/case)
    ```scheme
    (cond
      ((< x 0) 'negative)
      ((= x 0) 'zero)
      (else 'positive))
    ```

**lambda** *(params...)* *body*
:   Create anonymous function with lexical scoping
    ```scheme
    (lambda (x) (* x x))          ; Square function
    ((lambda (x y) (+ x y)) 3 4)  ; Apply immediately
    ```

**define** *name* *value*
:   Bind value to name in environment
    ```scheme
    (define pi 3.14159)
    (define square (lambda (x) (* x x)))
    ```

**set!** *name* *value*
:   Mutate existing variable
    ```scheme
    (define counter 0)
    (set! counter (+ counter 1))
    ```

**begin** *expr...*
:   Evaluate sequence of expressions, return last
    ```scheme
    (begin
      (define x 10)
      (define y 20)
      (+ x y))  ; → 30
    ```

**let** *((var val)...)* *body*
:   Local bindings (syntactic sugar for lambda)
    ```scheme
    (let ((x 10) (y 20))
      (+ x y))  ; → 30
    ```

### Arithmetic Functions
**+**, **-**, **\***, **/**
:   Basic arithmetic (variadic)
    ```scheme
    (+ 1 2 3)     ; → 6
    (- 10 3 2)    ; → 5
    (* 2 3 4)     ; → 24
    (/ 12 3 2)    ; → 2
    ```

### Comparison Functions
**=**, **eq**, **<**, **>**, **<=**, **>=**
:   Comparison operators
    ```scheme
    (= 5 5)       ; → #t (true)
    (< 3 5)       ; → #t
    (>= 5 5)      ; → #t
    ```

### List Functions
**list** *args...*
:   Create list from arguments
    ```scheme
    (list 1 2 3)  ; → (1 2 3)
    ```

**car** *list*
:   Get first element of list
    ```scheme
    (car (list 1 2 3))  ; → 1
    ```

**cdr** *list*
:   Get rest of list (all but first)
    ```scheme
    (cdr (list 1 2 3))  ; → (2 3)
    ```

**cons** *item* *list*
:   Prepend item to list
    ```scheme
    (cons 0 (list 1 2))  ; → (0 1 2)
    (cons 1 2)           ; → (1 2) - cons cell
    ```

**length** *list*
:   Get number of elements in list
    ```scheme
    (length (list 1 2 3 4))  ; → 4
    ```

**null?** *list*
:   Test if list is empty
    ```scheme
    (null? (list))   ; → #t
    (null? (list 1)) ; → #f (false)
    ```

### Logic Functions
**not** *value*
:   Logical negation
    ```scheme
    (not #f)  ; → #t
    (not 0)   ; → #t (0 is falsy)
    ```

**and** *args...*
:   Logical AND
    ```scheme
    (and 1 2 3)     ; → #t
    (and 1 #f 3)    ; → #f
    ```

**or** *args...*
:   Logical OR
    ```scheme
    (or #f #f 1)   ; → #t
    (or #f #f #f)  ; → #f
    ```

### Type Predicates
**number?**, **symbol?**, **list?**, **function?**
:   Test value types
    ```scheme
    (number? 5)         ; → #t
    (symbol? 'foo)      ; → #t
    (list? (list 1 2))  ; → #t
    (function? +)       ; → #t
    ```

### I/O Functions
**display** *value*
:   Output value without quotes
    ```scheme
    (display "Hello")    ; → Hello (no quotes)
    (display 42)         ; → 42
    ```

**write** *value*
:   Output value with proper representation (strings show quotes)
    ```scheme
    (write "Hello")      ; → "Hello" (with quotes)
    (write 42)           ; → 42
    ```

**print** *value*
:   Convenience function: display + newline
    ```scheme
    (print "Hello")      ; → Hello\n
    ```

**newline**
:   Output a newline character
    ```scheme
    (newline)            ; → \n
    ```

**read** *[string]*
:   Parse string as Schist code and return data structure
    - With argument: Parse the string
    - Without argument: Interactive read from user (waits for input)
    ```scheme
    (read "(+ 1 2)")     ; → (+ 1 2) as a list, not evaluated
    (eval (read "(+ 1 2)"))  ; → 3 (read then evaluate)
    (read)               ; → waits for user input, then parses it
    ```

### Metacircular Functions
**eval** *expr* *[env]*
:   Evaluate a quoted expression
    ```scheme
    (eval '(+ 1 2))  ; → 3
    ```

**apply** *function* *args-list*
:   Apply function to list of arguments
    ```scheme
    (apply + (list 1 2 3))  ; → 6
    (apply max (list 5 2 8 1))  ; → 8
    ```

## METACIRCULAR EVALUATOR
With `eval` and `apply`, Schist can describe itself. This demonstrates the "Maxwell's Equations of Software" concept - a complete system defined by a handful of primitives.

Here's a simplified metacircular evaluator in Schist:

```scheme
; Evaluate expression in environment
(define meta-eval
  (lambda (expr env)
    (cond
      ((number? expr) expr)                 ; Numbers evaluate to themselves
      ((symbol? expr) (lookup expr env))    ; Look up variables
      ((eq (car expr) 'quote)               ; Quote returns unevaluated
       (car (cdr expr)))
      ((eq (car expr) 'if)                  ; Conditional
       (if (meta-eval (car (cdr expr)) env)
           (meta-eval (car (cdr (cdr expr))) env)
           (meta-eval (car (cdr (cdr (cdr expr)))) env)))
      ((eq (car expr) 'lambda)              ; Lambda creates closure
       (list 'closure
             (car (cdr expr))
             (car (cdr (cdr expr)))
             env))
      (else                                  ; Function application
       (meta-apply (meta-eval (car expr) env)
                  (map (lambda (arg) (meta-eval arg env)) (cdr expr))
                  env)))))
```

See `examples/metacircular.scm` for a complete working example!

This shows that with just:
- **quote** - Don't evaluate
- **if** - Conditional
- **lambda** - Function abstraction
- **car**, **cdr**, **cons** - List primitives
- **eq** - Equality test

You can build a complete, self-describing Lisp interpreter. This is the essence of Lisp's elegance.

## EXAMPLES

### Interactive REPL
```bash
$ schist -i
Schist REPL v1.0
Type expressions to evaluate, Ctrl+C to exit

schist> (+ 1 2 3)
6
schist> (define square (lambda (x) (* x x)))
schist> (square 5)
25
schist> (define fact (lambda (n) (if (<= n 1) 1 (* n (fact (- n 1))))))
schist> (fact 5)
120
schist> ^C
$
```

### Basic Arithmetic
```bash
$ schist -e "(+ 1 2 3)"
6

$ schist -e "(/ 100 5 2)"
10
```

### Lambda Functions
```bash
# Square function
$ schist -e "((lambda (x) (* x x)) 5)"
25

# Closure example
$ schist -e "(let ((x 10)) ((lambda (y) (+ x y)) 20))"
30
```

### Recursion
```bash
# Factorial
$ schist -e "(define fact (lambda (n) (if (<= n 1) 1 (* n (fact (- n 1))))))"
$ schist -e "(fact 5)"
120
```

### Lists and Map
```bash
# Define map function
$ schist -e "(define map (lambda (f lst) (if (null? lst) (list) (cons (f (car lst)) (map f (cdr lst))))))"

# Use it
$ schist -e "(map (lambda (x) (* x 2)) (list 1 2 3 4))"
(2 4 6 8)
```

### File Execution
```bash
# Create a Schist program
$ vein factorial.scm
# (write factorial function)

$ schist factorial.scm
120
3628800
1
```

### Metacircular Evaluation
```bash
$ schist examples/metacircular.scm
6
25
42
```

### Self-Hosting REPL
```bash
# A Schist REPL written entirely in Schist!
$ schist examples/schist-repl.scm
Schist-in-Schist REPL v1.0
A REPL written entirely in Schist Lisp
Type expressions to evaluate, empty line to exit

schist-in-schist> (+ 1 2 3)
6
schist-in-schist> (define square (lambda (x) (* x x)))
<lambda>
schist-in-schist> (square 5)
25
schist-in-schist> ^C
Goodbye!
```

This demonstrates true **self-hosting** - Schist interpreting Schist code that implements a REPL using `read`, `eval`, and recursion. This is the "Maxwell's Equations of Software" in action!

## EXIT STATUS
Returns 0 on success, 1 on error.

## FILES
**examples/factorial.scm**
:   Recursive factorial demonstration

**examples/metacircular.scm**
:   Complete metacircular evaluator showing Schist interpreting itself

**examples/schist-repl.scm**
:   Self-hosting REPL - A Schist REPL written entirely in Schist

## NOTES

### Truthy/Falsy Values
- **Falsy**: `#f` (false) and `0`
- **Truthy**: Everything else, including empty lists

### Limitations
Schist is intentionally minimal (~600 lines). It lacks:
- Macros (no `defmacro` or `syntax-rules`)
- Continuations (no `call/cc`)
- Module system
- Comprehensive numeric tower (only floats)
- String operations (strings treated as symbols)
- File I/O (has console I/O with `read`, `write`, `display`, `print`, `newline`)

For these features, use a full Scheme implementation.

### Tail Call Optimization
Schist implements **proper tail call optimization** using a trampoline pattern. This means:
- **Infinite recursion** - Tail-recursive functions can recurse indefinitely without stack overflow
- **REPL stability** - The self-hosting REPL can run forever (tested to 100,000+ iterations)
- **Functional style** - Write naturally recursive code without worrying about stack limits

Example of tail recursion that works with unlimited depth:
```scheme
; Tail-recursive countdown
(define loop (lambda (n) (if (<= n 0) 'done (loop (- n 1)))))
(loop 100000)  ; Works! No stack overflow
```

### Interactive Features
- **REPL mode** (`-i`) provides an interactive development environment
- **Persistent environment** within REPL session (define variables, functions)
- **Error handling** shows parse and evaluation errors without crashing
- **Ctrl+C** exits REPL gracefully
- **Tail call optimization** - REPLs can run indefinitely without stack limits

### Why "Schist"?
Schist is a metamorphic rock with a distinctive layered structure formed under intense pressure and heat. The name reflects:
- **Layered structure** like nested s-expressions
- **Metamorphic** like Lisp's code-as-data transformation
- **Geological naming** matching Koma's komatiite theme

## SEE ALSO
**koma**(1), **sh**(1), **run**(1)

## RESOURCES
- Structure and Interpretation of Computer Programs (SICP)
- Paul Graham's "The Roots of Lisp"
- John McCarthy's original Lisp paper (1960)

## AUTHOR
Part of the Koma Terminal project.
