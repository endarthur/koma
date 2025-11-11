/**
 * Parser - Converts token stream into Abstract Syntax Tree
 *
 * Grammar (simplified):
 *   Input      → Sequence EOF
 *   Sequence   → Compound (';' Compound)*
 *   Compound   → Pipeline Redirects
 *   Pipeline   → Command ('|' Command)*
 *   Command    → WORD Args
 *   Args       → (WORD | STRING | VARIABLE)*
 *   Redirects  → ('<' WORD)? ('>' | '>>' WORD)?
 */

import { TokenType } from './lexer.js';
import {
  CommandNode,
  PipelineNode,
  CompoundNode,
  SequenceNode,
  AssignmentNode,
  VariableNode,
  EmptyNode
} from './ast-nodes.js';

/**
 * Parser - Builds AST from tokens
 */
export class Parser {
  /**
   * @param {Token[]} tokens - Array of tokens from Lexer
   */
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  /**
   * Get current token without advancing
   */
  peek(offset = 0) {
    const pos = this.position + offset;
    return pos < this.tokens.length ? this.tokens[pos] : null;
  }

  /**
   * Get current token and advance
   */
  advance() {
    if (this.position >= this.tokens.length) {
      return null;
    }
    return this.tokens[this.position++];
  }

  /**
   * Check if current token matches type
   */
  check(type) {
    const token = this.peek();
    return token && token.type === type;
  }

  /**
   * Consume token if it matches type, error otherwise
   */
  expect(type, message) {
    const token = this.peek();
    if (!token || token.type !== type) {
      const actual = token ? token.type : 'EOF';
      throw new Error(message || `Expected ${type}, got ${actual}`);
    }
    return this.advance();
  }

  /**
   * Skip newlines
   */
  skipNewlines() {
    while (this.check(TokenType.NEWLINE)) {
      this.advance();
    }
  }

  /**
   * Parse the entire input
   * Input → Sequence EOF
   */
  parse() {
    this.skipNewlines();

    // Empty input
    if (this.check(TokenType.EOF)) {
      return new EmptyNode();
    }

    const ast = this.parseSequence();

    // Should be at EOF now
    this.expect(TokenType.EOF, 'Unexpected tokens after command');

    return ast;
  }

  /**
   * Parse sequence of commands separated by semicolons or newlines
   * Sequence → Compound (';' | '\n' Compound)*
   */
  parseSequence() {
    const commands = [];

    commands.push(this.parseCompound());

    // Parse additional commands after semicolons or newlines
    while (true) {
      // Check for separators
      const hasSemicolon = this.check(TokenType.SEMICOLON);
      const hasNewline = this.check(TokenType.NEWLINE);

      if (!hasSemicolon && !hasNewline) {
        break; // No more commands
      }

      // Consume separator and any trailing newlines
      if (hasSemicolon) {
        this.advance(); // Consume semicolon
      }
      this.skipNewlines(); // Skip all newlines after separator

      // Separator at end of input is ok
      if (this.check(TokenType.EOF)) {
        break;
      }

      commands.push(this.parseCompound());
    }

    // If only one command, return it directly (no need for SequenceNode)
    if (commands.length === 1) {
      return commands[0];
    }

    return new SequenceNode(commands);
  }

  /**
   * Parse compound command (pipeline with redirects)
   * Compound → Pipeline Redirects
   */
  parseCompound() {
    const command = this.parsePipeline();
    const redirects = this.parseRedirects();

    // If no redirects, return command directly
    if (!redirects.input && !redirects.output) {
      return command;
    }

    return new CompoundNode(command, redirects);
  }

  /**
   * Parse pipeline (commands separated by pipes)
   * Pipeline → Command ('|' Command)*
   */
  parsePipeline() {
    const commands = [];

    commands.push(this.parseCommand());

    // Parse additional commands after pipes
    while (this.check(TokenType.PIPE)) {
      this.advance(); // Consume |
      this.skipNewlines();
      commands.push(this.parseCommand());
    }

    // If only one command, return it directly (no need for PipelineNode)
    if (commands.length === 1) {
      return commands[0];
    }

    return new PipelineNode(commands);
  }

  /**
   * Parse redirects (< input, > output, >> append)
   * Redirects → ('<' WORD)? ('>' | '>>' WORD)?
   */
  parseRedirects() {
    const redirects = {
      input: null,
      output: null,
      outputMode: 'write'
    };

    // Input redirect (<)
    if (this.check(TokenType.REDIRECT_IN)) {
      this.advance();
      const token = this.expect(TokenType.WORD, 'Expected filename after <');
      redirects.input = token.value;
    }

    // Output redirect (> or >>)
    if (this.check(TokenType.REDIRECT_OUT) || this.check(TokenType.REDIRECT_APPEND)) {
      const isAppend = this.check(TokenType.REDIRECT_APPEND);
      this.advance();
      const token = this.expect(TokenType.WORD, `Expected filename after ${isAppend ? '>>' : '>'}`);
      redirects.output = token.value;
      redirects.outputMode = isAppend ? 'append' : 'write';
    }

    return redirects;
  }

  /**
   * Parse a simple command
   * Command → ASSIGNMENT | WORD Args
   */
  parseCommand() {
    // Check for variable assignment
    if (this.check(TokenType.ASSIGNMENT)) {
      const token = this.advance();
      const [name, value] = token.value.split('=');
      return new AssignmentNode(name, value);
    }

    // Regular command
    const commandToken = this.expect(TokenType.WORD, 'Expected command');
    const args = this.parseArgs();

    return new CommandNode(commandToken.value, args);
  }

  /**
   * Parse command arguments
   * Args → (WORD | STRING | VARIABLE)*
   */
  parseArgs() {
    const args = [];

    while (true) {
      const token = this.peek();

      // Stop at operators, semicolons, newlines, or EOF
      if (!token ||
          token.type === TokenType.PIPE ||
          token.type === TokenType.SEMICOLON ||
          token.type === TokenType.REDIRECT_IN ||
          token.type === TokenType.REDIRECT_OUT ||
          token.type === TokenType.REDIRECT_APPEND ||
          token.type === TokenType.NEWLINE ||
          token.type === TokenType.EOF) {
        break;
      }

      this.advance();

      // Handle different argument types
      if (token.type === TokenType.WORD || token.type === TokenType.STRING) {
        args.push(token.value);
      } else if (token.type === TokenType.VARIABLE) {
        args.push(new VariableNode(token.value));
      } else {
        throw new Error(`Unexpected token in arguments: ${token.type}`);
      }
    }

    return args;
  }
}

/**
 * Convenience function to parse tokens into AST
 * @param {Token[]} tokens - Tokens from Lexer
 * @returns {ASTNode} Root node of the AST
 */
export function parse(tokens) {
  const parser = new Parser(tokens);
  return parser.parse();
}
