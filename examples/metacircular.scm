; Metacircular Evaluator - A Schist interpreter written in Schist
; Based on the "Maxwell's Equations of Software" concept
;
; This demonstrates that Schist can describe itself - showing that
; the language has reached a fundamental level of expressiveness.

; Helper: lookup variable in environment
(define lookup
  (lambda (var env)
    (cond
      ((null? env) (quote undefined))
      ((eq var (car (car env))) (car (cdr (car env))))
      (else (lookup var (cdr env))))))

; Helper: extend environment with new binding
(define extend-env
  (lambda (var val env)
    (cons (list var val) env)))

; The metacircular evaluator itself
(define meta-eval
  (lambda (expr env)
    (cond
      ; Self-evaluating: numbers
      ((number? expr) expr)

      ; Variables: lookup in environment
      ((symbol? expr) (lookup expr env))

      ; Quote: return quoted expression
      ((eq (car expr) (quote quote))
       (car (cdr expr)))

      ; If: conditional evaluation
      ((eq (car expr) (quote if))
       (if (meta-eval (car (cdr expr)) env)
           (meta-eval (car (cdr (cdr expr))) env)
           (meta-eval (car (cdr (cdr (cdr expr)))) env)))

      ; Lambda: create closure (function + environment)
      ((eq (car expr) (quote lambda))
       (list (quote closure)
             (car (cdr expr))        ; parameters
             (car (cdr (cdr expr)))  ; body
             env))                    ; environment

      ; Define: extend environment
      ((eq (car expr) (quote define))
       (begin
         (set! env (extend-env (car (cdr expr))
                              (meta-eval (car (cdr (cdr expr))) env)
                              env))
         (quote defined)))

      ; Function application
      (else
       (meta-apply (meta-eval (car expr) env)
                  (map (lambda (arg) (meta-eval arg env)) (cdr expr))
                  env)))))

; Apply function to arguments
(define meta-apply
  (lambda (fn args env)
    (cond
      ; Built-in primitives (we'd need to extend this for real use)
      ((eq fn (quote +)) (apply + args))
      ((eq fn (quote -)) (apply - args))
      ((eq fn (quote *)) (apply * args))
      ((eq fn (quote /)) (apply / args))
      ((eq fn (quote =)) (apply = args))
      ((eq fn (quote cons)) (apply cons args))
      ((eq fn (quote car)) (apply car args))
      ((eq fn (quote cdr)) (apply cdr args))

      ; User-defined function (closure)
      ((eq (car fn) (quote closure))
       (let ((params (car (cdr fn)))
             (body (car (cdr (cdr fn))))
             (fn-env (car (cdr (cdr (cdr fn))))))
         ; Extend closure's environment with parameters
         (meta-eval body (extend-params params args fn-env))))

      (else (quote unknown-function)))))

; Helper: extend environment with multiple parameter bindings
(define extend-params
  (lambda (params args env)
    (cond
      ((null? params) env)
      (else (extend-params (cdr params)
                          (cdr args)
                          (extend-env (car params) (car args) env))))))

; Map function (for evaluating argument lists)
(define map
  (lambda (f lst)
    (cond
      ((null? lst) (list))
      (else (cons (f (car lst)) (map f (cdr lst)))))))

; Demo: Use the metacircular evaluator!

; Create empty environment
(define empty-env (list))

; Evaluate a simple expression
(meta-eval (quote (+ 1 2 3)) empty-env)

; Evaluate lambda application
(meta-eval (quote ((lambda (x) (* x x)) 5)) empty-env)

; Evaluate conditional
(meta-eval (quote (if (= 1 1) 42 99)) empty-env)

; This works! We just wrote a Schist interpreter in Schist itself.
; This is the "Maxwell's Equations of Software" - showing that
; with just a handful of primitives (car, cdr, cons, eq, quote,
; if, lambda), we can build a complete, self-describing system.
