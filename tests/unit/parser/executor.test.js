/**
 * Unit tests for Executor
 */

import { expect } from 'chai';
import { Executor, execute } from '../../../src/parser/executor.js';
import {
  CommandNode,
  PipelineNode,
  CompoundNode,
  SequenceNode,
  AssignmentNode,
  VariableNode,
  EmptyNode
} from '../../../src/parser/ast-nodes.js';

// Mock Shell for testing
class MockShell {
  constructor() {
    this.commands = new Map();
    this.env = {
      HOME: '/home',
      USER: 'testuser',
      PATH: '/bin:/usr/bin'
    };
    this.term = new MockTerminal();
    this.executedCommands = [];
    this.executedPipelines = [];
    this.lastExitCode = 0; // Add exit code tracking
  }

  registerCommand(name, handler) {
    this.commands.set(name, handler);
  }

  async executePipeline(pipeline) {
    this.executedPipelines.push(pipeline);
  }
}

// Mock Terminal for testing
class MockTerminal {
  constructor() {
    this.lines = [];
  }

  writeln(line) {
    this.lines.push(line);
  }

  getOutput() {
    return this.lines.join('\n');
  }

  clear() {
    this.lines = [];
  }
}

describe('Executor', () => {
  let shell;
  let executor;

  beforeEach(() => {
    shell = new MockShell();
    executor = new Executor(shell);

    // Register some test commands
    shell.registerCommand('echo', async (args, shell, context) => {
      context.writeln(args.join(' '));
    });

    shell.registerCommand('pwd', async (args, shell, context) => {
      context.writeln(shell.cwd || '/home');
    });

    shell.registerCommand('test-cmd', async (args, shell, context) => {
      context.writeln('test-cmd executed');
    });
  });

  describe('Empty Nodes', () => {
    it('should execute empty node', async () => {
      const node = new EmptyNode();
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.lastExitCode).to.equal(0);
    });
  });

  describe('Simple Commands', () => {
    it('should execute simple command', async () => {
      const node = new CommandNode('echo', ['hello']);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.term.getOutput()).to.include('hello');
    });

    it('should execute command with multiple arguments', async () => {
      const node = new CommandNode('echo', ['hello', 'world']);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.term.getOutput()).to.include('hello world');
    });

    it('should handle command not found', async () => {
      const node = new CommandNode('nonexistent', []);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(127);
      expect(shell.term.getOutput()).to.include('command not found');
      expect(shell.lastExitCode).to.equal(127);
    });

    it('should execute command with no arguments', async () => {
      const node = new CommandNode('pwd', []);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.term.getOutput()).to.include('/home');
    });
  });

  describe('Variable Expansion', () => {
    it('should expand environment variable', async () => {
      const node = new CommandNode('echo', [new VariableNode('HOME')]);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.term.getOutput()).to.include('/home');
    });

    it('should expand multiple variables', async () => {
      const node = new CommandNode('echo', [
        new VariableNode('HOME'),
        new VariableNode('USER')
      ]);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.term.getOutput()).to.include('/home');
      expect(shell.term.getOutput()).to.include('testuser');
    });

    it('should expand $? (last exit code)', async () => {
      shell.lastExitCode = 42;
      const node = new CommandNode('echo', [new VariableNode('?')]);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.term.getOutput()).to.include('42');
    });

    it('should expand undefined variable to empty string', async () => {
      const node = new CommandNode('echo', [new VariableNode('UNDEFINED')]);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      // Should execute but with empty string
    });

    it('should mix strings and variables', async () => {
      const node = new CommandNode('echo', [
        'Hello',
        new VariableNode('USER'),
        'from',
        new VariableNode('HOME')
      ]);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.term.getOutput()).to.include('Hello testuser from /home');
    });
  });

  describe('Variable Assignments', () => {
    it('should assign variable', async () => {
      const node = new AssignmentNode('FOO', 'bar');
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.env.FOO).to.equal('bar');
    });

    it('should assign path variable', async () => {
      const node = new AssignmentNode('MY_PATH', '/usr/local/bin');
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.env.MY_PATH).to.equal('/usr/local/bin');
    });

    it('should overwrite existing variable', async () => {
      shell.env.TEST = 'old';
      const node = new AssignmentNode('TEST', 'new');
      await executor.execute(node);

      expect(shell.env.TEST).to.equal('new');
    });

    it('should assign then expand variable', async () => {
      // Assign FOO=bar
      const assignNode = new AssignmentNode('FOO', 'bar');
      await executor.execute(assignNode);

      // Echo $FOO
      const echoNode = new CommandNode('echo', [new VariableNode('FOO')]);
      await executor.execute(echoNode);

      expect(shell.term.getOutput()).to.include('bar');
    });
  });

  describe('Sequences', () => {
    it('should execute two commands in sequence', async () => {
      const node = new SequenceNode([
        new CommandNode('echo', ['first']),
        new CommandNode('echo', ['second'])
      ]);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      const output = shell.term.getOutput();
      expect(output).to.include('first');
      expect(output).to.include('second');
    });

    it('should execute three commands in sequence', async () => {
      const node = new SequenceNode([
        new CommandNode('echo', ['one']),
        new CommandNode('echo', ['two']),
        new CommandNode('echo', ['three'])
      ]);
      await executor.execute(node);

      const output = shell.term.getOutput();
      expect(output).to.include('one');
      expect(output).to.include('two');
      expect(output).to.include('three');
    });

    it('should continue sequence even if command fails', async () => {
      const node = new SequenceNode([
        new CommandNode('nonexistent', []),
        new CommandNode('echo', ['still-runs'])
      ]);
      const exitCode = await executor.execute(node);

      // Last command succeeded
      const output = shell.term.getOutput();
      expect(output).to.include('command not found');
      expect(output).to.include('still-runs');
    });

    it('should return exit code of last command', async () => {
      const node = new SequenceNode([
        new CommandNode('echo', ['success']),
        new CommandNode('nonexistent', [])
      ]);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(127); // Last command failed
    });

    it('should execute assignment in sequence', async () => {
      const node = new SequenceNode([
        new AssignmentNode('FOO', 'bar'),
        new CommandNode('echo', [new VariableNode('FOO')])
      ]);
      await executor.execute(node);

      expect(shell.env.FOO).to.equal('bar');
      expect(shell.term.getOutput()).to.include('bar');
    });
  });

  describe('Pipelines', () => {
    it('should execute simple pipeline', async () => {
      const node = new PipelineNode([
        new CommandNode('echo', ['hello']),
        new CommandNode('test-cmd', [])
      ]);
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.executedPipelines).to.have.lengthOf(1);
      expect(shell.executedPipelines[0].stages).to.have.lengthOf(2);
      expect(shell.executedPipelines[0].stages[0].command).to.equal('echo');
      expect(shell.executedPipelines[0].stages[1].command).to.equal('test-cmd');
    });

    it('should execute three-stage pipeline', async () => {
      const node = new PipelineNode([
        new CommandNode('echo', ['test']),
        new CommandNode('test-cmd', []),
        new CommandNode('pwd', [])
      ]);
      await executor.execute(node);

      expect(shell.executedPipelines[0].stages).to.have.lengthOf(3);
    });

    it('should expand variables in pipeline', async () => {
      const node = new PipelineNode([
        new CommandNode('echo', [new VariableNode('HOME')]),
        new CommandNode('test-cmd', [])
      ]);
      await executor.execute(node);

      expect(shell.executedPipelines[0].stages[0].args).to.deep.equal(['/home']);
    });

    it('should throw on non-command in pipeline', async () => {
      const node = new PipelineNode([
        new CommandNode('echo', ['test']),
        new AssignmentNode('FOO', 'bar') // Invalid in pipeline
      ]);

      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(1); // Error exit code
      expect(shell.term.getOutput()).to.include('Pipeline can only contain commands');
    });
  });

  describe('Compound Nodes (Redirects)', () => {
    it('should execute command with input redirect', async () => {
      const node = new CompoundNode(
        new CommandNode('test-cmd', []),
        { input: 'input.txt', output: null, outputMode: 'write' }
      );
      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(0);
      expect(shell.executedPipelines[0].inputFile).to.equal('input.txt');
    });

    it('should execute command with output redirect', async () => {
      const node = new CompoundNode(
        new CommandNode('echo', ['hello']),
        { input: null, output: 'output.txt', outputMode: 'write' }
      );
      await executor.execute(node);

      expect(shell.executedPipelines[0].outputFile).to.equal('output.txt');
      expect(shell.executedPipelines[0].outputMode).to.equal('write');
    });

    it('should execute command with append redirect', async () => {
      const node = new CompoundNode(
        new CommandNode('echo', ['hello']),
        { input: null, output: 'output.txt', outputMode: 'append' }
      );
      await executor.execute(node);

      expect(shell.executedPipelines[0].outputMode).to.equal('append');
    });

    it('should execute command with both redirects', async () => {
      const node = new CompoundNode(
        new CommandNode('test-cmd', []),
        { input: 'input.txt', output: 'output.txt', outputMode: 'write' }
      );
      await executor.execute(node);

      expect(shell.executedPipelines[0].inputFile).to.equal('input.txt');
      expect(shell.executedPipelines[0].outputFile).to.equal('output.txt');
    });

    it('should execute pipeline with output redirect', async () => {
      const pipeline = new PipelineNode([
        new CommandNode('echo', ['test']),
        new CommandNode('test-cmd', [])
      ]);
      const node = new CompoundNode(
        pipeline,
        { input: null, output: 'output.txt', outputMode: 'write' }
      );
      await executor.execute(node);

      expect(shell.executedPipelines[0].stages).to.have.lengthOf(2);
      expect(shell.executedPipelines[0].outputFile).to.equal('output.txt');
    });

    it('should expand variables in redirected command', async () => {
      const node = new CompoundNode(
        new CommandNode('echo', [new VariableNode('HOME')]),
        { input: null, output: 'output.txt', outputMode: 'write' }
      );
      await executor.execute(node);

      expect(shell.executedPipelines[0].stages[0].args).to.deep.equal(['/home']);
    });
  });

  describe('Complex Scenarios', () => {
    it('should execute sequence with pipelines', async () => {
      const node = new SequenceNode([
        new PipelineNode([
          new CommandNode('echo', ['first']),
          new CommandNode('test-cmd', [])
        ]),
        new CommandNode('echo', ['second'])
      ]);
      await executor.execute(node);

      expect(shell.executedPipelines).to.have.lengthOf(1);
      const output = shell.term.getOutput();
      expect(output).to.include('second');
    });

    it('should execute sequence with assignments and commands', async () => {
      const node = new SequenceNode([
        new AssignmentNode('FOO', 'bar'),
        new CommandNode('echo', [new VariableNode('FOO')]),
        new AssignmentNode('BAZ', 'qux'),
        new CommandNode('echo', [new VariableNode('BAZ')])
      ]);
      await executor.execute(node);

      expect(shell.env.FOO).to.equal('bar');
      expect(shell.env.BAZ).to.equal('qux');
      const output = shell.term.getOutput();
      expect(output).to.include('bar');
      expect(output).to.include('qux');
    });

    it('should track exit codes through sequence', async () => {
      const node = new SequenceNode([
        new CommandNode('echo', ['success']),
        new CommandNode('nonexistent', []),
        new CommandNode('echo', [new VariableNode('?')])
      ]);
      await executor.execute(node);

      // Should show 127 from the failed command
      const output = shell.term.getOutput();
      expect(output).to.include('127');
    });
  });

  describe('Exit Code Tracking', () => {
    it('should track successful execution', async () => {
      const node = new CommandNode('echo', ['test']);
      await executor.execute(node);

      expect(shell.lastExitCode).to.equal(0);
    });

    it('should track command not found', async () => {
      const node = new CommandNode('nonexistent', []);
      await executor.execute(node);

      expect(shell.lastExitCode).to.equal(127);
    });

    it('should allow setting exit code', () => {
      shell.lastExitCode = 42;
      expect(shell.lastExitCode).to.equal(42);
    });

    it('should expand $? correctly', async () => {
      shell.lastExitCode = 99;
      const expanded = executor.expandVariable('?');

      expect(expanded).to.equal('99');
    });
  });

  describe('Convenience Function', () => {
    it('should execute AST with convenience function', async () => {
      const ast = new CommandNode('echo', ['test']);
      const exitCode = await execute(ast, shell);

      expect(exitCode).to.equal(0);
      expect(shell.term.getOutput()).to.include('test');
    });
  });

  describe('Error Handling', () => {
    it('should catch and report errors', async () => {
      const node = new CommandNode('echo', ['test']);

      // Break the shell to cause error
      shell.commands.delete('echo');

      const exitCode = await executor.execute(node);

      expect(exitCode).to.equal(127);
    });

    it('should handle unknown node types', async () => {
      const badNode = { type: 'Unknown' };

      const exitCode = await executor.execute(badNode);

      expect(exitCode).to.equal(1); // Error exit code
      expect(shell.term.getOutput()).to.include('Unknown AST node type');
    });
  });
});
