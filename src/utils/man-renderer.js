/**
 * Man Page Renderer
 * Converts markdown to ANSI-formatted terminal output
 */

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  underline: '\x1b[4m',
  dim: '\x1b[2m',

  // Colors
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  orange: '\x1b[38;5;208m',
};

/**
 * Render markdown text to ANSI escape sequences
 * @param {string} markdown - Markdown content
 * @param {number} terminalWidth - Terminal width for wrapping (default: 80)
 * @returns {Array<string>} Array of formatted lines
 */
export function renderManPage(markdown, terminalWidth = 80) {
  const lines = [];
  const mdLines = markdown.split('\n');

  let inCodeBlock = false;
  let inList = false;
  let currentParagraph = [];

  for (let i = 0; i < mdLines.length; i++) {
    const line = mdLines[i];

    // Code blocks (```)
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;

      // Flush paragraph before code block
      if (inCodeBlock && currentParagraph.length > 0) {
        lines.push(...wrapParagraph(currentParagraph.join(' '), terminalWidth));
        currentParagraph = [];
      }

      continue;
    }

    if (inCodeBlock) {
      // Render code with dim color and indentation
      lines.push(`  ${COLORS.dim}${line}${COLORS.reset}`);
      continue;
    }

    // Headers (# Header)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      // Flush any pending paragraph
      if (currentParagraph.length > 0) {
        lines.push(...wrapParagraph(currentParagraph.join(' '), terminalWidth));
        currentParagraph = [];
      }

      const level = headerMatch[1].length;
      const text = headerMatch[2];

      if (level === 1) {
        // # NAME - Bold and underlined
        lines.push('');
        lines.push(`${COLORS.bold}${COLORS.underline}${text}${COLORS.reset}`);
        lines.push('');
      } else if (level === 2) {
        // ## SECTION - Bold
        lines.push('');
        lines.push(`${COLORS.bold}${text}${COLORS.reset}`);
        lines.push('');
      } else {
        // ### Subsection - Just bold, smaller
        lines.push(`${COLORS.bold}${text}${COLORS.reset}`);
      }

      inList = false;
      continue;
    }

    // List items (- item or * item)
    const listMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
    if (listMatch) {
      // Flush any pending paragraph
      if (currentParagraph.length > 0) {
        lines.push(...wrapParagraph(currentParagraph.join(' '), terminalWidth));
        currentParagraph = [];
      }

      const indent = listMatch[1].length;
      const content = listMatch[3];
      const indentStr = ' '.repeat(indent);

      // Render list item with bullet
      const rendered = renderInline(content);
      lines.push(`${indentStr}  ${COLORS.cyan}•${COLORS.reset} ${rendered}`);

      inList = true;
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      // Flush paragraph
      if (currentParagraph.length > 0) {
        lines.push(...wrapParagraph(currentParagraph.join(' '), terminalWidth));
        currentParagraph = [];
      }

      lines.push('');
      inList = false;
      continue;
    }

    // Regular paragraph text
    // If we're in a list and this line is indented, treat it as list continuation
    if (inList && line.match(/^\s+\S/)) {
      const rendered = renderInline(line.trim());
      lines.push(`    ${rendered}`);
    } else {
      // Accumulate paragraph lines
      currentParagraph.push(line.trim());
    }
  }

  // Flush any remaining paragraph
  if (currentParagraph.length > 0) {
    lines.push(...wrapParagraph(currentParagraph.join(' '), terminalWidth));
  }

  return lines;
}

/**
 * Render inline markdown (bold, italic, code, links)
 * @param {string} text - Text with inline markdown
 * @returns {string} Text with ANSI codes
 */
function renderInline(text) {
  // Inline code (`code`)
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    return `${COLORS.green}${code}${COLORS.reset}`;
  });

  // Bold (**text** or __text__)
  text = text.replace(/(\*\*|__)([^*_]+)\1/g, (_, __, content) => {
    return `${COLORS.bold}${content}${COLORS.reset}`;
  });

  // Italic (*text* or _text_) - but not in middle of word
  text = text.replace(/(^|\s)(\*|_)([^*_]+)\2(\s|$)/g, (_, before, __, content, after) => {
    return `${before}${COLORS.underline}${content}${COLORS.reset}${after}`;
  });

  // Links [text](url) - just show text in blue
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, (_, linkText) => {
    return `${COLORS.blue}${linkText}${COLORS.reset}`;
  });

  return text;
}

/**
 * Wrap paragraph text to terminal width
 * @param {string} text - Paragraph text
 * @param {number} width - Terminal width
 * @returns {Array<string>} Wrapped lines
 */
function wrapParagraph(text, width = 80) {
  const rendered = renderInline(text);
  const words = rendered.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    // Account for ANSI escape codes when measuring length
    const visualLength = stripAnsi(currentLine + ' ' + word).length;

    if (visualLength > width && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Strip ANSI escape codes for length measurement
 * @param {string} text - Text with ANSI codes
 * @returns {string} Text without ANSI codes
 */
function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Format a man page with standard sections
 * @param {object} sections - Man page sections
 * @returns {string} Formatted markdown
 */
export function formatManPage(sections) {
  const parts = [];

  if (sections.name) {
    parts.push(`# NAME`);
    parts.push(sections.name);
    parts.push('');
  }

  if (sections.synopsis) {
    parts.push(`## SYNOPSIS`);
    parts.push(sections.synopsis);
    parts.push('');
  }

  if (sections.description) {
    parts.push(`## DESCRIPTION`);
    parts.push(sections.description);
    parts.push('');
  }

  if (sections.options) {
    parts.push(`## OPTIONS`);
    parts.push(sections.options);
    parts.push('');
  }

  if (sections.examples) {
    parts.push(`## EXAMPLES`);
    parts.push(sections.examples);
    parts.push('');
  }

  if (sections.seeAlso) {
    parts.push(`## SEE ALSO`);
    parts.push(sections.seeAlso);
    parts.push('');
  }

  return parts.join('\n');
}
