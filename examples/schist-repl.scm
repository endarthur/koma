; A Schist REPL written in Schist itself!
; This demonstrates true self-hosting - Schist interpreting Schist

; Welcome message
(print "Schist-in-Schist REPL v1.0")
(print "A REPL written entirely in Schist Lisp")
(print "Type expressions to evaluate, empty line to exit")
(newline)

; The REPL function
(define repl
  (lambda ()
    (begin
      ; Show prompt and read input
      (display "schist-in-schist> ")
      (let ((input (read)))
        (cond
          ; Empty list (Ctrl+C or empty input) - exit
          ((null? input)
           (begin
             (print "Goodbye!")
             0))

          ; Evaluate and show result
          (else
           (begin
             (print (eval input))
             (repl))))))))  ; Tail recursion

; Start the REPL!
(repl)
