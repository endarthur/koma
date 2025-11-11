/**
 * Unit tests for Parser
 */

import { expect } from 'chai';
import { tokenize } from '../../../src/parser/lexer.js';
import { Parser, parse } from '../../../src/parser/parser.js';
import {
  CommandNode,
  PipelineNode,
  CompoundNode,
  SequenceNode,
  AssignmentNode,
  VariableNode,
  EmptyNode
} from '../../../src/parser/ast-nodes.js';

describe('Parser', () => {
  describe('Simple Commands', () => {
    it('should parse a simple command', () => {
      const tokens = tokenize('ls');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(CommandNode);
      expect(ast.command).to.equal('ls');
      expect(ast.args).to.have.lengthOf(0);
    });

    it('should parse command with arguments', () => {
      const tokens = tokenize('cat file.txt');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(CommandNode);
      expect(ast.command).to.equal('cat');
      expect(ast.args).to.deep.equal(['file.txt']);
    });

    it('should parse command with multiple arguments', () => {
      const tokens = tokenize('ls -la /home /tmp');
      const ast = parse(tokens);

      expect(ast.command).to.equal('ls');
      expect(ast.args).to.deep.equal(['-la', '/home', '/tmp']);
    });

    it('should parse command with quoted arguments', () => {
      const tokens = tokenize('echo "hello world"');
      const ast = parse(tokens);

      expect(ast.command).to.equal('echo');
      expect(ast.args).to.deep.equal(['hello world']);
    });

    it('should parse empty input', () => {
      const tokens = tokenize('');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(EmptyNode);
    });

    it('should parse whitespace-only input', () => {
      const tokens = tokenize('   \t   ');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(EmptyNode);
    });
  });

  describe('Pipelines', () => {
    it('should parse simple pipeline', () => {
      const tokens = tokenize('cat file.txt | grep foo');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(PipelineNode);
      expect(ast.commands).to.have.lengthOf(2);
      expect(ast.commands[0].command).to.equal('cat');
      expect(ast.commands[1].command).to.equal('grep');
    });

    it('should parse three-stage pipeline', () => {
      const tokens = tokenize('cat file.txt | grep foo | sort');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(PipelineNode);
      expect(ast.commands).to.have.lengthOf(3);
      expect(ast.commands[2].command).to.equal('sort');
    });

    it('should preserve arguments in pipeline', () => {
      const tokens = tokenize('ls -la | grep test');
      const ast = parse(tokens);

      expect(ast.commands[0].args).to.deep.equal(['-la']);
      expect(ast.commands[1].args).to.deep.equal(['test']);
    });
  });

  describe('Redirects', () => {
    it('should parse input redirect', () => {
      const tokens = tokenize('sort < input.txt');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(CompoundNode);
      expect(ast.command).to.be.instanceOf(CommandNode);
      expect(ast.redirects.input).to.equal('input.txt');
      expect(ast.redirects.output).to.be.null;
    });

    it('should parse output redirect', () => {
      const tokens = tokenize('echo hello > output.txt');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(CompoundNode);
      expect(ast.redirects.output).to.equal('output.txt');
      expect(ast.redirects.outputMode).to.equal('write');
    });

    it('should parse append redirect', () => {
      const tokens = tokenize('echo hello >> output.txt');
      const ast = parse(tokens);

      expect(ast.redirects.output).to.equal('output.txt');
      expect(ast.redirects.outputMode).to.equal('append');
    });

    it('should parse both input and output redirects', () => {
      const tokens = tokenize('cat < input.txt > output.txt');
      const ast = parse(tokens);

      expect(ast.redirects.input).to.equal('input.txt');
      expect(ast.redirects.output).to.equal('output.txt');
    });

    it('should parse pipeline with output redirect', () => {
      const tokens = tokenize('cat file.txt | grep foo > results.txt');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(CompoundNode);
      expect(ast.command).to.be.instanceOf(PipelineNode);
      expect(ast.redirects.output).to.equal('results.txt');
    });
  });

  describe('Sequences (Semicolons)', () => {
    it('should parse two commands with semicolon', () => {
      const tokens = tokenize('cd /tmp ; ls');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(SequenceNode);
      expect(ast.commands).to.have.lengthOf(2);
      expect(ast.commands[0].command).to.equal('cd');
      expect(ast.commands[1].command).to.equal('ls');
    });

    it('should parse three commands with semicolons', () => {
      const tokens = tokenize('mkdir test ; cd test ; pwd');
      const ast = parse(tokens);

      expect(ast.commands).to.have.lengthOf(3);
      expect(ast.commands[0].command).to.equal('mkdir');
      expect(ast.commands[1].command).to.equal('cd');
      expect(ast.commands[2].command).to.equal('pwd');
    });

    it('should handle trailing semicolon', () => {
      const tokens = tokenize('ls ;');
      const ast = parse(tokens);

      // Trailing semicolon should be ignored
      expect(ast).to.be.instanceOf(CommandNode);
      expect(ast.command).to.equal('ls');
    });

    it('should parse sequence with pipelines', () => {
      const tokens = tokenize('cat file.txt | grep foo ; ls -la');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(SequenceNode);
      expect(ast.commands[0]).to.be.instanceOf(PipelineNode);
      expect(ast.commands[1]).to.be.instanceOf(CommandNode);
    });
  });

  describe('Variable Assignments', () => {
    it('should parse simple assignment', () => {
      const tokens = tokenize('NAME=value');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(AssignmentNode);
      expect(ast.name).to.equal('NAME');
      expect(ast.value).to.equal('value');
    });

    it('should parse assignment with path', () => {
      const tokens = tokenize('PATH=/usr/bin');
      const ast = parse(tokens);

      expect(ast.name).to.equal('PATH');
      expect(ast.value).to.equal('/usr/bin');
    });

    it('should parse multiple assignments with semicolons', () => {
      const tokens = tokenize('FOO=bar ; BAZ=qux');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(SequenceNode);
      expect(ast.commands[0]).to.be.instanceOf(AssignmentNode);
      expect(ast.commands[1]).to.be.instanceOf(AssignmentNode);
    });
  });

  describe('Variables in Arguments', () => {
    it('should parse variable in arguments', () => {
      const tokens = tokenize('echo $HOME');
      const ast = parse(tokens);

      expect(ast.command).to.equal('echo');
      expect(ast.args).to.have.lengthOf(1);
      expect(ast.args[0]).to.be.instanceOf(VariableNode);
      expect(ast.args[0].name).to.equal('HOME');
    });

    it('should parse mixed arguments with variables', () => {
      const tokens = tokenize('echo hello $USER world');
      const ast = parse(tokens);

      expect(ast.args).to.have.lengthOf(3);
      expect(ast.args[0]).to.equal('hello');
      expect(ast.args[1]).to.be.instanceOf(VariableNode);
      expect(ast.args[1].name).to.equal('USER');
      expect(ast.args[2]).to.equal('world');
    });

    it('should parse special variables', () => {
      const tokens = tokenize('echo $?');
      const ast = parse(tokens);

      expect(ast.args[0]).to.be.instanceOf(VariableNode);
      expect(ast.args[0].name).to.equal('?');
    });
  });

  describe('Complex Commands', () => {
    it('should parse complex pipeline with redirects', () => {
      // In our simplified grammar, redirects come at the end
      const tokens = tokenize('cat file.txt | grep foo | sort < input.txt > output.txt');
      const ast = parse(tokens);

      // Root is CompoundNode (has redirects)
      expect(ast).to.be.instanceOf(CompoundNode);
      expect(ast.redirects.input).to.equal('input.txt');
      expect(ast.redirects.output).to.equal('output.txt');

      // Inner command is PipelineNode
      expect(ast.command).to.be.instanceOf(PipelineNode);
      expect(ast.command.commands).to.have.lengthOf(3);
    });

    it('should parse sequence with various command types', () => {
      const tokens = tokenize('FOO=bar ; echo $FOO ; cat file.txt | grep test');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(SequenceNode);
      expect(ast.commands).to.have.lengthOf(3);
      expect(ast.commands[0]).to.be.instanceOf(AssignmentNode);
      expect(ast.commands[1]).to.be.instanceOf(CommandNode);
      expect(ast.commands[2]).to.be.instanceOf(PipelineNode);
    });

    it('should parse command with variables and redirects', () => {
      const tokens = tokenize('echo $HOME > greeting.txt');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(CompoundNode);
      expect(ast.command.args[0]).to.be.instanceOf(VariableNode);
      expect(ast.redirects.output).to.equal('greeting.txt');
    });
  });

  describe('Newlines', () => {
    it('should handle newlines in sequence', () => {
      const tokens = tokenize('ls\npwd');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(SequenceNode);
      expect(ast.commands).to.have.lengthOf(2);
    });

    it('should skip leading newlines', () => {
      const tokens = tokenize('\n\nls');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(CommandNode);
      expect(ast.command).to.equal('ls');
    });

    it('should skip trailing newlines', () => {
      const tokens = tokenize('ls\n\n');
      const ast = parse(tokens);

      expect(ast).to.be.instanceOf(CommandNode);
      expect(ast.command).to.equal('ls');
    });
  });

  describe('Error Handling', () => {
    it('should throw on unexpected EOF after pipe', () => {
      const tokens = tokenize('cat |');

      expect(() => parse(tokens)).to.throw(/Expected command/);
    });

    it('should throw on unexpected EOF after redirect', () => {
      const tokens = tokenize('cat >');

      expect(() => parse(tokens)).to.throw(/Expected filename/);
    });

    it('should throw on invalid redirect', () => {
      const tokens = tokenize('cat > |');

      expect(() => parse(tokens)).to.throw();
    });
  });

  describe('AST String Representation', () => {
    it('should have toString for CommandNode', () => {
      const tokens = tokenize('ls -la');
      const ast = parse(tokens);

      const str = ast.toString();
      expect(str).to.include('Command');
      expect(str).to.include('ls');
    });

    it('should have toString for PipelineNode', () => {
      const tokens = tokenize('cat | grep');
      const ast = parse(tokens);

      const str = ast.toString();
      expect(str).to.include('Pipeline');
      expect(str).to.include('|');
    });

    it('should have toString for SequenceNode', () => {
      const tokens = tokenize('ls ; pwd');
      const ast = parse(tokens);

      const str = ast.toString();
      expect(str).to.include('Sequence');
      expect(str).to.include(';');
    });
  });
});
