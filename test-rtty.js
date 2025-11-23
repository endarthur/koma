/**
 * Test RTTY encode/decode round trip
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the RTTY module
const rttyPath = join(__dirname, 'src', 'commands', 'rtty.js');

// For testing, we'll inline the key functions since we can't easily import from the module

const FREQ_MARK = 2125;
const FREQ_SPACE = 2295;
const BAUD_RATE = 45.45;
const BIT_DURATION = 1.0 / BAUD_RATE;

// Baudot tables (simplified for test)
const BAUDOT_LTRS = {
  0x04: ' ', 0x01: 'E', 0x10: 'T', 0x03: 'A', 0x18: 'O', 0x06: 'I', 0x0C: 'N', 0x05: 'S',
  0x14: 'H', 0x0A: 'R', 0x09: 'D', 0x12: 'L', 0x15: 'Y', 0x0F: 'K', 0x13: 'W', 0x19: 'B',
  0x1A: 'G', 0x0D: 'F', 0x1C: 'M', 0x07: 'U', 0x16: 'P', 0x0E: 'C', 0x17: 'Q', 0x1D: 'X',
  0x1E: 'V', 0x11: 'Z', 0x0B: 'J', 0x02: '\n', 0x08: '\r'
};

const LTRS_TO_BAUDOT = {};
for (const [code, char] of Object.entries(BAUDOT_LTRS)) {
  LTRS_TO_BAUDOT[char] = parseInt(code);
}

function textToBaudot(text) {
  const codes = [];
  text = text.toUpperCase();

  for (const char of text) {
    if (char in LTRS_TO_BAUDOT) {
      codes.push(LTRS_TO_BAUDOT[char]);
    } else {
      codes.push(LTRS_TO_BAUDOT[' ']);
    }
  }

  return codes;
}

function baudotToText(codes) {
  let text = '';
  for (const code of codes) {
    const char = BAUDOT_LTRS[code];
    if (char) {
      text += char;
    }
  }
  return text;
}

function generateBit(samples, frequency, duration, sampleRate) {
  const totalSamples = Math.floor(duration * sampleRate);
  const startSample = samples.length;

  for (let i = 0; i < totalSamples; i++) {
    const t = (startSample + i) / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t);
    samples.push(sample);
  }
}

function encodeRTTY(text, sampleRate = 22050) {
  const baudotCodes = textToBaudot(text);
  const samples = [];

  // Leader: 1 second of mark
  const leaderBits = Math.floor(BAUD_RATE);
  for (let i = 0; i < leaderBits; i++) {
    generateBit(samples, FREQ_MARK, BIT_DURATION, sampleRate);
  }

  // Encode each character: start(0) + 5 data bits (LSB) + 1.5 stop(1)
  for (const code of baudotCodes) {
    generateBit(samples, FREQ_SPACE, BIT_DURATION, sampleRate);

    for (let i = 0; i < 5; i++) {
      const bit = (code >> i) & 1;
      const freq = bit ? FREQ_MARK : FREQ_SPACE;
      generateBit(samples, freq, BIT_DURATION, sampleRate);
    }

    generateBit(samples, FREQ_MARK, BIT_DURATION * 1.5, sampleRate);
  }

  // Trailer: 0.5 second
  const trailerBits = Math.floor(BAUD_RATE * 0.5);
  for (let i = 0; i < trailerBits; i++) {
    generateBit(samples, FREQ_MARK, BIT_DURATION, sampleRate);
  }

  const pcmData = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    pcmData[i] = Math.floor(samples[i] * 32767);
  }

  return { samples: new Float32Array(samples), pcmData, sampleRate };
}

function goertzel(samples, offset, length, targetFreq, sampleRate) {
  const k = Math.round((length * targetFreq) / sampleRate);
  const omega = (2 * Math.PI * k) / length;
  const cosine = Math.cos(omega);
  const coeff = 2 * cosine;

  let s0 = 0, s1 = 0, s2 = 0;

  for (let i = 0; i < length && offset + i < samples.length; i++) {
    s0 = samples[offset + i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }

  return s1 * s1 + s2 * s2 - coeff * s1 * s2;
}

function detectRTTYBits(samples, sampleRate) {
  const bits = [];
  const samplesPerBit = Math.floor(sampleRate / BAUD_RATE);

  let offset = Math.floor(sampleRate);  // Skip leader

  while (offset < samples.length - samplesPerBit) {
    const markPower = goertzel(samples, offset, samplesPerBit, FREQ_MARK, sampleRate);
    const spacePower = goertzel(samples, offset, samplesPerBit, FREQ_SPACE, sampleRate);

    bits.push(markPower > spacePower ? 1 : 0);
    offset += samplesPerBit;
  }

  return bits;
}

function decodeBaudotFromBits(bits) {
  const codes = [];
  let i = 0;

  while (i < bits.length - 7) {
    if (bits[i] === 0) {  // Start bit
      let code = 0;
      let valid = true;

      for (let j = 0; j < 5; j++) {
        if (i + 1 + j >= bits.length) {
          valid = false;
          break;
        }
        code |= (bits[i + 1 + j] << j);
      }

      if (valid && i + 6 < bits.length && bits[i + 6] === 1) {
        codes.push(code);
        i += 8;
        continue;
      }
    }
    i++;
  }

  return codes;
}

// Run test
console.log("RTTY Round-Trip Test");
console.log("====================\n");

const originalMessage = "HELLO WORLD";
console.log(`Original: "${originalMessage}"`);
console.log(`Length: ${originalMessage.length} characters\n`);

// Encode
console.log("Step 1: Encoding to RTTY audio...");
const { samples, sampleRate } = encodeRTTY(originalMessage, 22050);
console.log(`  Generated ${samples.length} samples at ${sampleRate} Hz`);
console.log(`  Duration: ${(samples.length / sampleRate).toFixed(2)}s\n`);

// Decode
console.log("Step 2: Decoding RTTY audio...");
const bits = detectRTTYBits(samples, sampleRate);
console.log(`  Detected ${bits.length} bits`);

const baudotCodes = decodeBaudotFromBits(bits);
console.log(`  Decoded ${baudotCodes.length} Baudot codes`);

const decodedMessage = baudotToText(baudotCodes);
console.log(`  Decoded text: "${decodedMessage}"\n`);

// Compare
console.log("Step 3: Comparing...");
const match = originalMessage === decodedMessage;
console.log(`Match: ${match ? '✓ YES' : '✗ NO'}`);

if (!match) {
  console.log(`\nExpected: "${originalMessage}"`);
  console.log(`Got:      "${decodedMessage}"`);

  console.log(`\nLength: ${originalMessage.length} vs ${decodedMessage.length}`);

  console.log("\nBaudot codes comparison:");
  const expected = textToBaudot(originalMessage);
  for (let i = 0; i < Math.max(expected.length, baudotCodes.length); i++) {
    const exp = i < expected.length ? expected[i].toString(2).padStart(5, '0') : '     ';
    const got = i < baudotCodes.length ? baudotCodes[i].toString(2).padStart(5, '0') : '     ';
    const expChar = i < expected.length ? BAUDOT_LTRS[expected[i]] || '?' : ' ';
    const gotChar = i < baudotCodes.length ? BAUDOT_LTRS[baudotCodes[i]] || '?' : ' ';
    const marker = exp === got ? ' ' : '✗';
    console.log(`  [${i}] ${exp} (${expChar}) ${marker} ${got} (${gotChar})`);
  }
} else {
  console.log("\n✓ SUCCESS! Round-trip encoding/decoding works!");
  console.log(`\nRTTY successfully encoded and decoded ${originalMessage.length} characters.`);
}
