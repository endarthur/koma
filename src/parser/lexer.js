/**
 * Lexer - Tokenizes shell input into typed tokens
 *
 * Converts raw shell commands into a stream of tokens with types.
 * Handles quotes, operators, variables, and whitespace.
 */

/**
 * Token Types
 */
export const TokenType = {
  // Literals
  WORD: 'WORD',                    // Regular word: cat, file.txt, /path/to/file
  STRING: 'STRING',                // Quoted string (preserves quote type)
  VARIABLE: 'VARIABLE',            // $VAR or ${VAR}

  // Operators
  PIPE: 'PIPE',                    // |
  SEMICOLON: 'SEMICOLON',          // ;
  REDIRECT_IN: 'REDIRECT_IN',      // <
  REDIRECT_OUT: 'REDIRECT_OUT',    // >
  REDIRECT_APPEND: 'REDIRECT_APPEND', // >>
  LPAREN: 'LPAREN',                // (
  RPAREN: 'RPAREN',                // )

  // Assignment
  ASSIGNMENT: 'ASSIGNMENT',        // NAME=value

  // Special
  EOF: 'EOF',                      // End of input
  NEWLINE: 'NEWLINE',             // Line break (for multi-line constructs)
};

/**
 * Token - Single lexical unit
 */
export class Token {
  /**
   * @param {string} type - Token type from TokenType
   * @param {string} value - Token value
   * @param {number} position - Character position in input
   * @param {number} line - Line number (for multi-line input)
   * @param {number} column - Column number
   */
  constructor(type, value, position = 0, line = 1, column = 0) {
    this.type = type;
    this.value = value;
    this.position = position;
    this.line = line;
    this.column = column;
  }

  toString() {
    return `Token(${this.type}, "${this.value}", ${this.line}:${this.column})`;
  }
}

/**
 * Lexer - Tokenizes shell input
 */
export class Lexer {
  constructor(input) {
    this.input = input;
    this.position = 0;
    this.line = 1;
    this.column = 0;
    this.tokens = [];
  }

  /**
   * Get current character without advancing
   */
  peek(offset = 0) {
    const pos = this.position + offset;
    return pos < this.input.length ? this.input[pos] : null;
  }

  /**
   * Get current character and advance position
   */
  advance() {
    if (this.position >= this.input.length) {
      return null;
    }

    const char = this.input[this.position];
    this.position++;
    this.column++;

    if (char === '\n') {
      this.line++;
      this.column = 0;
    }

    return char;
  }

  /**
   * Skip whitespace (except newlines)
   */
  skipWhitespace() {
    while (this.peek() && this.peek() !== '\n' && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  /**
   * Check if character is a word character
   */
  isWordChar(char) {
    if (!char) return false;
    // Word characters: letters, digits, underscore, dash, dot, slash, backslash, etc.
    // Basically anything that's not a special shell character
    // Note: = is excluded so we can detect assignments (NAME=value)
    // Note: \ is INCLUDED to allow escape sequences in unquoted words (like echo hello\nworld)
    return !/[\s|;<>&$="']/.test(char);
  }

  /**
   * Tokenize a quoted string
   * @param {string} quoteChar - ' or "
   */
  tokenizeQuotedString(quoteChar) {
    const startPos = this.position;
    const startLine = this.line;
    const startCol = this.column;

    // Skip opening quote
    this.advance();

    let value = '';
    let escaped = false;

    while (true) {
      const char = this.peek();

      // Unexpected end of input
      if (char === null) {
        throw new Error(`Unterminated ${quoteChar} quote at ${startLine}:${startCol}`);
      }

      // Single quotes: no escape processing at all
      if (quoteChar === "'") {
        if (char === "'") {
          this.advance(); // Skip closing quote
          break;
        }
        value += char;
        this.advance();
        continue;
      }

      // Double quotes: handle escape sequences
      if (char === '\\' && !escaped) {
        escaped = true;
        this.advance();
        continue;
      }

      // End of quoted string
      if (char === '"' && !escaped) {
        this.advance(); // Skip closing quote
        break;
      }

      // Regular character
      value += char;
      this.advance();
      escaped = false;
    }

    return new Token(
      TokenType.STRING,
      value,
      startPos,
      startLine,
      startCol
    );
  }

  /**
   * Tokenize a variable reference: $VAR or ${VAR}
   */
  tokenizeVariable() {
    const startPos = this.position;
    const startLine = this.line;
    const startCol = this.column;

    // Skip $
    this.advance();

    // Handle ${VAR} syntax
    if (this.peek() === '{') {
      this.advance(); // Skip {
      let name = '';

      while (this.peek() && this.peek() !== '}') {
        name += this.advance();
      }

      if (this.peek() !== '}') {
        throw new Error(`Unterminated variable expansion at ${startLine}:${startCol}`);
      }

      this.advance(); // Skip }

      return new Token(
        TokenType.VARIABLE,
        name,
        startPos,
        startLine,
        startCol
      );
    }

    // Handle $VAR syntax (alphanumeric + underscore)
    let name = '';
    while (this.peek() && /[a-zA-Z0-9_?#@]/.test(this.peek())) {
      name += this.advance();
    }

    if (name === '') {
      // Just a standalone $, treat as word
      return new Token(
        TokenType.WORD,
        '$',
        startPos,
        startLine,
        startCol
      );
    }

    return new Token(
      TokenType.VARIABLE,
      name,
      startPos,
      startLine,
      startCol
    );
  }

  /**
   * Tokenize a word (unquoted sequence of characters)
   */
  tokenizeWord() {
    const startPos = this.position;
    const startLine = this.line;
    const startCol = this.column;

    let value = '';

    while (this.peek() && this.isWordChar(this.peek())) {
      value += this.advance();
    }

    // Check if this is an assignment (NAME=value)
    if (this.peek() === '=' && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
      // This is a variable assignment
      this.advance(); // Skip =

      // Get the value part (everything until whitespace or operator)
      let assignValue = '';
      while (this.peek() && this.isWordChar(this.peek())) {
        assignValue += this.advance();
      }

      return new Token(
        TokenType.ASSIGNMENT,
        `${value}=${assignValue}`,
        startPos,
        startLine,
        startCol
      );
    }

    return new Token(
      TokenType.WORD,
      value,
      startPos,
      startLine,
      startCol
    );
  }

  /**
   * Tokenize the input and return array of tokens
   * @returns {Token[]} Array of tokens
   */
  tokenize() {
    this.tokens = [];

    while (this.position < this.input.length) {
      this.skipWhitespace();

      const char = this.peek();

      // End of input
      if (char === null) {
        break;
      }

      const startPos = this.position;
      const startLine = this.line;
      const startCol = this.column;

      // Newline
      if (char === '\n') {
        this.advance();
        this.tokens.push(new Token(
          TokenType.NEWLINE,
          '\n',
          startPos,
          startLine,
          startCol
        ));
        continue;
      }

      // Pipe
      if (char === '|') {
        this.advance();
        this.tokens.push(new Token(
          TokenType.PIPE,
          '|',
          startPos,
          startLine,
          startCol
        ));
        continue;
      }

      // Semicolon
      if (char === ';') {
        this.advance();
        this.tokens.push(new Token(
          TokenType.SEMICOLON,
          ';',
          startPos,
          startLine,
          startCol
        ));
        continue;
      }

      // Parentheses (for Schist s-expressions)
      if (char === '(') {
        this.advance();
        this.tokens.push(new Token(
          TokenType.LPAREN,
          '(',
          startPos,
          startLine,
          startCol
        ));
        continue;
      }

      if (char === ')') {
        this.advance();
        this.tokens.push(new Token(
          TokenType.RPAREN,
          ')',
          startPos,
          startLine,
          startCol
        ));
        continue;
      }

      // Redirect operators
      if (char === '<') {
        this.advance();
        this.tokens.push(new Token(
          TokenType.REDIRECT_IN,
          '<',
          startPos,
          startLine,
          startCol
        ));
        continue;
      }

      if (char === '>') {
        this.advance();
        // Check for >>
        if (this.peek() === '>') {
          this.advance();
          this.tokens.push(new Token(
            TokenType.REDIRECT_APPEND,
            '>>',
            startPos,
            startLine,
            startCol
          ));
        } else {
          this.tokens.push(new Token(
            TokenType.REDIRECT_OUT,
            '>',
            startPos,
            startLine,
            startCol
          ));
        }
        continue;
      }

      // Single-quoted string
      if (char === "'") {
        this.tokens.push(this.tokenizeQuotedString("'"));
        continue;
      }

      // Double-quoted string
      if (char === '"') {
        this.tokens.push(this.tokenizeQuotedString('"'));
        continue;
      }

      // Variable reference
      if (char === '$') {
        this.tokens.push(this.tokenizeVariable());
        continue;
      }

      // Word
      if (this.isWordChar(char)) {
        this.tokens.push(this.tokenizeWord());
        continue;
      }

      // Unknown character
      throw new Error(`Unexpected character '${char}' at ${startLine}:${startCol}`);
    }

    // Add EOF token
    this.tokens.push(new Token(
      TokenType.EOF,
      '',
      this.position,
      this.line,
      this.column
    ));

    return this.tokens;
  }
}

/**
 * Convenience function to tokenize input
 * @param {string} input - Shell command to tokenize
 * @returns {Token[]} Array of tokens
 */
export function tokenize(input) {
  const lexer = new Lexer(input);
  return lexer.tokenize();
}
