import { describe, it, expect } from 'vitest';
import { parseSchist, evaluateSchist, createSchistEnv } from '../../../src/parser/schist.js';

describe('Schist Tail Call Optimization', () => {
  it('should handle deep tail recursion without stack overflow', async () => {
    const env = createSchistEnv();

    // Define a tail-recursive count function
    const defineExpr = parseSchist('(define count (lambda (n) (if (<= n 0) 0 (count (- n 1)))))');
    await evaluateSchist(defineExpr, env);

    // Test with deep recursion (10000 should work without TCO limits)
    const callExpr = parseSchist('(count 10000)');
    const result = await evaluateSchist(callExpr, env);

    expect(result).toBe(0);
  });

  it('should handle tail-recursive factorial', async () => {
    const env = createSchistEnv();

    // Define tail-recursive factorial with accumulator
    const defineExpr = parseSchist(`
      (define fact-tail
        (lambda (n acc)
          (if (<= n 1)
            acc
            (fact-tail (- n 1) (* acc n)))))
    `);
    await evaluateSchist(defineExpr, env);

    // Test with moderately deep recursion
    const callExpr = parseSchist('(fact-tail 10 1)');
    const result = await evaluateSchist(callExpr, env);

    // 10! = 3628800
    expect(result).toBe(3628800);
  });

  it('should handle tail-recursive sum', async () => {
    const env = createSchistEnv();

    // Define tail-recursive sum
    const defineExpr = parseSchist(`
      (define sum-tail
        (lambda (n acc)
          (if (<= n 0)
            acc
            (sum-tail (- n 1) (+ n acc)))))
    `);
    await evaluateSchist(defineExpr, env);

    // Sum from 1 to 100
    const callExpr = parseSchist('(sum-tail 100 0)');
    const result = await evaluateSchist(callExpr, env);

    // Sum of 1..100 = 5050
    expect(result).toBe(5050);
  });

  it('should handle tail recursion in cond branches', async () => {
    const env = createSchistEnv();

    // Define function with tail-recursive cond
    const defineExpr = parseSchist(`
      (define countdown
        (lambda (n)
          (cond
            ((<= n 0) 'done)
            (else (countdown (- n 1))))))
    `);
    await evaluateSchist(defineExpr, env);

    // Test with deep recursion
    const callExpr = parseSchist('(countdown 5000)');
    const result = await evaluateSchist(callExpr, env);

    expect(result).toBe('done');
  });

  it('should handle tail recursion in begin', async () => {
    const env = createSchistEnv();

    // Define function with tail-recursive begin
    const defineExpr = parseSchist(`
      (define loop
        (lambda (n)
          (begin
            (define dummy 1)
            (if (<= n 0) 'done (loop (- n 1))))))
    `);
    await evaluateSchist(defineExpr, env);

    // Test with deep recursion
    const callExpr = parseSchist('(loop 5000)');
    const result = await evaluateSchist(callExpr, env);

    expect(result).toBe('done');
  });

  it('should handle mutual tail recursion', async () => {
    const env = createSchistEnv();

    // Define mutually tail-recursive even/odd functions
    await evaluateSchist(parseSchist(`
      (define is-even
        (lambda (n)
          (if (= n 0)
            #t
            (is-odd (- n 1)))))
    `), env);

    await evaluateSchist(parseSchist(`
      (define is-odd
        (lambda (n)
          (if (= n 0)
            #f
            (is-even (- n 1)))))
    `), env);

    // Test with moderately deep mutual recursion
    const result1 = await evaluateSchist(parseSchist('(is-even 1000)'), env);
    const result2 = await evaluateSchist(parseSchist('(is-odd 1001)'), env);

    // Schist uses #t for true, not JavaScript true
    expect(result1).toBe('#t');
    expect(result2).toBe('#t');
  });

  it('should handle the self-hosting REPL indefinitely', async () => {
    // This test simulates the REPL pattern
    const env = createSchistEnv();

    // Define a simplified REPL-like function
    const defineExpr = parseSchist(`
      (define fake-repl
        (lambda (count)
          (if (<= count 0)
            'done
            (fake-repl (- count 1)))))
    `);
    await evaluateSchist(defineExpr, env);

    // Simulate many REPL iterations (would overflow without TCO)
    const callExpr = parseSchist('(fake-repl 10000)');
    const result = await evaluateSchist(callExpr, env);

    expect(result).toBe('done');
  });

  it('should handle very deep recursion (100k calls)', async () => {
    const env = createSchistEnv();

    // Define ultra-simple tail-recursive function
    const defineExpr = parseSchist('(define deep (lambda (n) (if (<= n 0) 0 (deep (- n 1)))))');
    await evaluateSchist(defineExpr, env);

    // Test with very deep recursion (this would definitely overflow without TCO)
    const callExpr = parseSchist('(deep 100000)');
    const result = await evaluateSchist(callExpr, env);

    expect(result).toBe(0);
  });
});
