/**
 * RTTY (Radioteletype) encoding/decoding
 *
 * Amateur radio digital mode using FSK (Frequency-Shift Keying)
 * - Mark (1): 2125 Hz
 * - Space (0): 2295 Hz
 * - Baud rate: 45.45 baud
 * - Encoding: 5-bit Baudot (ITA2)
 */

import { kernelClient } from '../kernel/client.js';
import { resolvePath, showError, showSuccess, showInfo } from '../utils/command-utils.js';
import { createArgsModule } from '../stdlib/args.js';

const argparse = createArgsModule();

// RTTY constants
const FREQ_MARK = 2125;   // Binary 1
const FREQ_SPACE = 2295;  // Binary 0
const BAUD_RATE = 45.45;  // Standard RTTY baud rate
const BIT_DURATION = 1.0 / BAUD_RATE;  // ~22ms per bit

// Baudot (ITA2) code table
// Two modes: LTRS (letters) and FIGS (figures)
const BAUDOT_LTRS = {
  0x00: '\x00',  // NUL
  0x01: 'E',
  0x02: '\n',    // LF
  0x03: 'A',
  0x04: ' ',
  0x05: 'S',
  0x06: 'I',
  0x07: 'U',
  0x08: '\r',    // CR
  0x09: 'D',
  0x0A: 'R',
  0x0B: 'J',
  0x0C: 'N',
  0x0D: 'F',
  0x0E: 'C',
  0x0F: 'K',
  0x10: 'T',
  0x11: 'Z',
  0x12: 'L',
  0x13: 'W',
  0x14: 'H',
  0x15: 'Y',
  0x16: 'P',
  0x17: 'Q',
  0x18: 'O',
  0x19: 'B',
  0x1A: 'G',
  0x1B: '<FIGS>',  // Shift to figures
  0x1C: 'M',
  0x1D: 'X',
  0x1E: 'V',
  0x1F: '<LTRS>'   // Shift to letters
};

const BAUDOT_FIGS = {
  0x00: '\x00',
  0x01: '3',
  0x02: '\n',
  0x03: '-',
  0x04: ' ',
  0x05: "'",     // BELL in some variants
  0x06: '8',
  0x07: '7',
  0x08: '\r',
  0x09: '$',     // WRU in some variants
  0x0A: '4',
  0x0B: '\x07',  // BELL
  0x0C: ',',
  0x0D: '!',
  0x0E: ':',
  0x0F: '(',
  0x10: '5',
  0x11: '+',
  0x12: ')',
  0x13: '2',
  0x14: '#',     // POUND in some variants
  0x15: '6',
  0x16: '0',
  0x17: '1',
  0x18: '9',
  0x19: '?',
  0x1A: '&',
  0x1B: '<FIGS>',
  0x1C: '.',
  0x1D: '/',
  0x1E: '=',     // ; in some variants
  0x1F: '<LTRS>'
};

// Reverse lookup tables for encoding
const LTRS_TO_BAUDOT = {};
const FIGS_TO_BAUDOT = {};

for (const [code, char] of Object.entries(BAUDOT_LTRS)) {
  if (char !== '<FIGS>' && char !== '<LTRS>') {
    LTRS_TO_BAUDOT[char] = parseInt(code);
  }
}

for (const [code, char] of Object.entries(BAUDOT_FIGS)) {
  if (char !== '<FIGS>' && char !== '<LTRS>') {
    FIGS_TO_BAUDOT[char] = parseInt(code);
  }
}

const SHIFT_TO_FIGS = 0x1B;
const SHIFT_TO_LTRS = 0x1F;

/**
 * Convert text to Baudot codes
 */
function textToBaudot(text) {
  const codes = [];
  let inFigsMode = false;

  // Normalize text to uppercase
  text = text.toUpperCase();

  for (const char of text) {
    // Check if character is in letters
    if (char in LTRS_TO_BAUDOT) {
      if (inFigsMode && char !== ' ' && char !== '\n' && char !== '\r') {
        codes.push(SHIFT_TO_LTRS);
        inFigsMode = false;
      }
      codes.push(LTRS_TO_BAUDOT[char]);
    }
    // Check if character is in figures
    else if (char in FIGS_TO_BAUDOT) {
      if (!inFigsMode) {
        codes.push(SHIFT_TO_FIGS);
        inFigsMode = true;
      }
      codes.push(FIGS_TO_BAUDOT[char]);
    }
    // Unknown character - skip or substitute with space
    else {
      if (inFigsMode) {
        codes.push(SHIFT_TO_LTRS);
        inFigsMode = false;
      }
      codes.push(LTRS_TO_BAUDOT[' ']);
    }
  }

  return codes;
}

/**
 * Convert Baudot codes to text
 */
function baudotToText(codes) {
  let text = '';
  let inFigsMode = false;

  for (const code of codes) {
    if (code === SHIFT_TO_FIGS) {
      inFigsMode = true;
      continue;
    }
    if (code === SHIFT_TO_LTRS) {
      inFigsMode = false;
      continue;
    }

    const table = inFigsMode ? BAUDOT_FIGS : BAUDOT_LTRS;
    const char = table[code];
    if (char && char !== '<FIGS>' && char !== '<LTRS>') {
      text += char;
    }
  }

  return text;
}

/**
 * Generate samples for one bit
 */
function generateBit(samples, frequency, duration, sampleRate) {
  const totalSamples = Math.floor(duration * sampleRate);
  const startSample = samples.length;

  for (let i = 0; i < totalSamples; i++) {
    const t = (startSample + i) / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t);
    samples.push(sample);
  }
}

/**
 * Encode text to RTTY WAV audio
 */
function encodeRTTY(text, sampleRate = 22050) {
  const baudotCodes = textToBaudot(text);
  const samples = [];

  // Leader tone: 1 second of mark
  const leaderBits = Math.floor(BAUD_RATE);
  for (let i = 0; i < leaderBits; i++) {
    generateBit(samples, FREQ_MARK, BIT_DURATION, sampleRate);
  }

  // Encode each Baudot character
  // Format: start bit (0) + 5 data bits (LSB first) + 1.5 stop bits (1)
  for (const code of baudotCodes) {
    // Start bit (space/0)
    generateBit(samples, FREQ_SPACE, BIT_DURATION, sampleRate);

    // 5 data bits (LSB first)
    for (let i = 0; i < 5; i++) {
      const bit = (code >> i) & 1;
      const freq = bit ? FREQ_MARK : FREQ_SPACE;
      generateBit(samples, freq, BIT_DURATION, sampleRate);
    }

    // 1.5 stop bits (mark/1)
    generateBit(samples, FREQ_MARK, BIT_DURATION * 1.5, sampleRate);
  }

  // Trailer tone: 0.5 second of mark
  const trailerBits = Math.floor(BAUD_RATE * 0.5);
  for (let i = 0; i < trailerBits; i++) {
    generateBit(samples, FREQ_MARK, BIT_DURATION, sampleRate);
  }

  // Convert to PCM
  const pcmData = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    pcmData[i] = Math.floor(samples[i] * 32767);
  }

  return buildWAVFile(pcmData, sampleRate);
}

/**
 * Decode RTTY WAV audio to text
 */
function decodeRTTY(wavData) {
  // Parse WAV file
  const { samples, sampleRate } = parseWAVFile(wavData);

  // Detect bits using frequency detection
  const bits = detectRTTYBits(samples, sampleRate);

  // Decode Baudot characters from bits
  const baudotCodes = decodeBaudotFromBits(bits);

  // Convert Baudot to text
  return baudotToText(baudotCodes);
}

/**
 * Parse WAV file to get samples
 */
function parseWAVFile(wavData) {
  const view = new DataView(wavData);

  // Verify RIFF/WAVE
  const riff = String.fromCharCode(
    view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)
  );
  const wave = String.fromCharCode(
    view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
  );

  if (riff !== 'RIFF' || wave !== 'WAVE') {
    throw new Error('Not a valid WAV file');
  }

  // Find data chunk
  let offset = 12;
  let dataOffset = -1;
  let dataSize = 0;
  let sampleRate = 0;
  let numChannels = 1;
  let bitsPerSample = 16;

  while (offset < view.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      sampleRate = view.getUint32(offset + 12, true);
      numChannels = view.getUint16(offset + 10, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === 'data') {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }

    offset += 8 + chunkSize;
  }

  if (dataOffset === -1) {
    throw new Error('No data chunk found in WAV file');
  }

  // Extract samples
  const numSamples = dataSize / (bitsPerSample / 8) / numChannels;
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const sampleOffset = dataOffset + i * (bitsPerSample / 8) * numChannels;
    let sample;

    if (bitsPerSample === 16) {
      sample = view.getInt16(sampleOffset, true) / 32768.0;
    } else if (bitsPerSample === 8) {
      sample = (view.getUint8(sampleOffset) - 128) / 128.0;
    } else {
      throw new Error(`Unsupported bit depth: ${bitsPerSample}`);
    }

    samples[i] = sample;
  }

  return { samples, sampleRate };
}

/**
 * Detect RTTY bits from audio samples using Goertzel algorithm
 */
function detectRTTYBits(samples, sampleRate) {
  const bits = [];
  const samplesPerBit = Math.floor(sampleRate / BAUD_RATE);

  // Skip leader (1 second)
  let offset = Math.floor(sampleRate);

  while (offset < samples.length - samplesPerBit) {
    // Use Goertzel algorithm to detect mark vs space frequency
    const markPower = goertzel(samples, offset, samplesPerBit, FREQ_MARK, sampleRate);
    const spacePower = goertzel(samples, offset, samplesPerBit, FREQ_SPACE, sampleRate);

    // Mark (1) if mark frequency is stronger, otherwise Space (0)
    bits.push(markPower > spacePower ? 1 : 0);

    offset += samplesPerBit;
  }

  return bits;
}

/**
 * Goertzel algorithm for single-frequency DFT
 * More efficient than full FFT for detecting specific frequencies
 */
function goertzel(samples, offset, length, targetFreq, sampleRate) {
  const k = Math.round((length * targetFreq) / sampleRate);
  const omega = (2 * Math.PI * k) / length;
  const cosine = Math.cos(omega);
  const sine = Math.sin(omega);
  const coeff = 2 * cosine;

  let s0 = 0;
  let s1 = 0;
  let s2 = 0;

  for (let i = 0; i < length && offset + i < samples.length; i++) {
    s0 = samples[offset + i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }

  // Calculate power
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return power;
}

/**
 * Decode Baudot characters from bit stream
 */
function decodeBaudotFromBits(bits) {
  const codes = [];
  let i = 0;

  // Look for start bit (0) followed by 5 data bits and stop bits (1)
  while (i < bits.length - 7) {  // Need at least 7.5 bits
    // Look for start bit (0)
    if (bits[i] === 0) {
      // Read 5 data bits (LSB first)
      let code = 0;
      let valid = true;

      for (let j = 0; j < 5; j++) {
        if (i + 1 + j >= bits.length) {
          valid = false;
          break;
        }
        code |= (bits[i + 1 + j] << j);
      }

      // Check stop bit (should be 1)
      if (valid && i + 6 < bits.length && bits[i + 6] === 1) {
        codes.push(code);
        i += 8;  // Skip start + 5 data + 1.5 stop (we'll just skip 7-8 bits)
        continue;
      }
    }
    i++;
  }

  return codes;
}

/**
 * Build WAV file from PCM data
 */
function buildWAVFile(pcmData, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length * 2;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  let offset = 0;

  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset++, str.charCodeAt(i));
    }
  }

  // RIFF chunk
  writeString('RIFF');
  view.setUint32(offset, 36 + dataSize, true); offset += 4;
  writeString('WAVE');

  // fmt chunk
  writeString('fmt ');
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;  // PCM
  view.setUint16(offset, numChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bitsPerSample, true); offset += 2;

  // data chunk
  writeString('data');
  view.setUint32(offset, dataSize, true); offset += 4;

  // PCM data
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(offset, pcmData[i], true);
    offset += 2;
  }

  return buffer;
}

/**
 * Get WAV file info
 */
function getWAVInfo(wavData) {
  const view = new DataView(wavData);

  let offset = 12;
  let sampleRate = 0;
  let numChannels = 0;
  let bitsPerSample = 0;
  let dataSize = 0;

  while (offset < view.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      sampleRate = view.getUint32(offset + 12, true);
      numChannels = view.getUint16(offset + 10, true);
      bitsPerSample = view.getUint16(offset + 22, true);
    } else if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }

    offset += 8 + chunkSize;
  }

  const duration = dataSize / (sampleRate * numChannels * (bitsPerSample / 8));

  return { sampleRate, numChannels, bitsPerSample, dataSize, duration, fileSize: view.byteLength };
}

/**
 * Convert ArrayBuffer to string for VFS
 */
function arrayBufferToString(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

/**
 * Convert string to ArrayBuffer
 */
function stringToArrayBuffer(str) {
  const buffer = new ArrayBuffer(str.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    view[i] = str.charCodeAt(i);
  }
  return buffer;
}

/**
 * Register RTTY commands
 */
export function registerRTTYCommands(shell) {
  shell.registerCommand('rtty', async (args, shell) => {
    const schema = {
      description: 'RTTY (Radioteletype) audio encoding/decoding',
      positional: { description: '<subcommand> [args...]' },
      flags: {
        rate: { type: 'string', description: 'Sample rate in Hz (default: 22050)' }
      },
      examples: [
        { command: 'rtty encode message.txt message.wav', description: 'Encode text to RTTY audio' },
        { command: 'rtty decode audio.wav output.txt', description: 'Decode RTTY audio to text' },
        { command: 'rtty play audio.wav', description: 'Play RTTY audio' },
        { command: 'rtty info audio.wav', description: 'Show WAV file information' }
      ]
    };

    if (argparse.showHelp('rtty', args, schema, shell.term)) return;

    const parsed = argparse.parse(args, schema);

    if (parsed.positional.length === 0) {
      showError(shell.term, 'rtty', 'missing subcommand');
      shell.term.writeln('Usage: rtty <subcommand> [args...]');
      shell.term.writeln('Subcommands: encode, decode, play, info');
      return;
    }

    const subcommand = parsed.positional[0];
    const kernel = await kernelClient.getKernel();
    const sampleRate = parsed.flags.rate ? parseInt(parsed.flags.rate) : 22050;

    try {
      switch (subcommand) {
        case 'encode': {
          if (parsed.positional.length < 3) {
            showError(shell.term, 'rtty encode', 'missing arguments');
            shell.term.writeln('Usage: rtty encode <input.txt> <output.wav>');
            return;
          }

          const inputPath = resolvePath(parsed.positional[1], shell.cwd, shell.env.HOME);
          const outputPath = resolvePath(parsed.positional[2], shell.cwd, shell.env.HOME);

          shell.term.writeln(`Reading: ${inputPath}`);
          const inputText = await kernel.readFile(inputPath);

          shell.term.writeln(`Encoding to RTTY (${BAUD_RATE} baud, ${sampleRate} Hz)...`);
          const wavBuffer = encodeRTTY(inputText, sampleRate);

          shell.term.writeln('Writing WAV file...');
          const wavString = arrayBufferToString(wavBuffer);
          await kernel.writeFile(outputPath, wavString);

          const sizeKB = (wavBuffer.byteLength / 1024).toFixed(1);
          const duration = wavBuffer.byteLength / (sampleRate * 2);

          shell.term.writeln('');
          showSuccess(shell.term, '', `Created ${outputPath}`);
          shell.term.writeln(`Size: ${sizeKB} KB`);
          shell.term.writeln(`Duration: ${duration.toFixed(1)}s`);
          shell.term.writeln(`Format: ${sampleRate} Hz, 16-bit mono`);
          shell.term.writeln(`Baud rate: ${BAUD_RATE} (RTTY standard)`);
          shell.term.writeln('');
          showInfo(shell.term, '', 'Compatible with ham radio RTTY receivers!');
          break;
        }

        case 'decode': {
          if (parsed.positional.length < 3) {
            showError(shell.term, 'rtty decode', 'missing arguments');
            shell.term.writeln('Usage: rtty decode <input.wav> <output.txt>');
            return;
          }

          const inputPath = resolvePath(parsed.positional[1], shell.cwd, shell.env.HOME);
          const outputPath = resolvePath(parsed.positional[2], shell.cwd, shell.env.HOME);

          shell.term.writeln(`Reading WAV file: ${inputPath}`);
          const wavString = await kernel.readFile(inputPath);
          const wavBuffer = stringToArrayBuffer(wavString);

          shell.term.writeln('Decoding RTTY audio...');
          const decoded = decodeRTTY(wavBuffer);

          shell.term.writeln('Writing decoded text...');
          await kernel.writeFile(outputPath, decoded);

          shell.term.writeln('');
          showSuccess(shell.term, '', `Decoded to ${outputPath}`);
          shell.term.writeln(`Decoded ${decoded.length} characters`);
          break;
        }

        case 'play': {
          if (parsed.positional.length < 2) {
            showError(shell.term, 'rtty play', 'missing WAV file');
            shell.term.writeln('Usage: rtty play <file.wav>');
            return;
          }

          const wavPath = resolvePath(parsed.positional[1], shell.cwd, shell.env.HOME);

          shell.term.writeln(`Loading: ${wavPath}`);
          const wavString = await kernel.readFile(wavPath);
          const wavBuffer = stringToArrayBuffer(wavString);

          shell.term.writeln('Playing RTTY audio...');

          // Use Web Audio API to play the WAV
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(wavBuffer);

          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.destination);
          source.start(0);

          showInfo(shell.term, '', 'Playing... (audio will play through your speakers)');
          break;
        }

        case 'info': {
          if (parsed.positional.length < 2) {
            showError(shell.term, 'rtty info', 'missing WAV file');
            shell.term.writeln('Usage: rtty info <file.wav>');
            return;
          }

          const wavPath = resolvePath(parsed.positional[1], shell.cwd, shell.env.HOME);

          shell.term.writeln(`Reading WAV file: ${wavPath}`);
          const wavString = await kernel.readFile(wavPath);
          const wavBuffer = stringToArrayBuffer(wavString);

          const info = getWAVInfo(wavBuffer);

          shell.term.writeln('');
          showSuccess(shell.term, '', 'WAV File Information');
          shell.term.writeln(`Sample rate:   ${info.sampleRate} Hz`);
          shell.term.writeln(`Channels:      ${info.numChannels === 1 ? 'Mono' : 'Stereo'}`);
          shell.term.writeln(`Bit depth:     ${info.bitsPerSample}-bit`);
          shell.term.writeln(`Data size:     ${(info.dataSize / 1024).toFixed(1)} KB`);
          shell.term.writeln(`File size:     ${(info.fileSize / 1024).toFixed(1)} KB`);
          shell.term.writeln(`Duration:      ${info.duration.toFixed(2)}s`);
          shell.term.writeln('');
          showInfo(shell.term, '', 'Format: RTTY FSK (45.45 baud)');
          break;
        }

        default: {
          showError(shell.term, 'rtty', `unknown subcommand: ${subcommand}`);
          shell.term.writeln('Available subcommands: encode, decode, play, info');
          break;
        }
      }
    } catch (error) {
      showError(shell.term, 'rtty', error.message);
      console.error('[rtty]', error);
    }
  }, {
    category: 'media'
  });
}
