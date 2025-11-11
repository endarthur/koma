; Factorial - Schist Demo
; Calculate factorial using recursion

; Define factorial function
(define fact (lambda (n) (if (<= n 1) 1 (* n (fact (- n 1))))))

; Test with some values
(fact 5)
(fact 10)
(fact 0)
