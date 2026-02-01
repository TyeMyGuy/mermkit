import assert from "node:assert/strict";
import { runCli } from "./helpers.mjs";
import { asciiFixtures, sequenceFixtures } from "./ascii-fixtures.mjs";

const baseGraphInput = `graph LR\nA --> B\n`;
const baseGraphExpected = `+---+     +---+\n|   |     |   |\n| A |---->| B |\n|   |     |   |\n+---+     +---+`;

const baseSequenceInput = `sequenceDiagram\n    participant A\n    participant B\n    A->>B: Hello\n`;
const baseSequenceExpected = `+---+     +---+\n| A |     | B |\n+-+-+     +-+-+\n  |         |\n  | Hello   |\n  +-------->|\n  |         |`;

async function runAscii(input, expected) {
  const res = await runCli(["render", "--stdin", "--format", "ascii", "--ascii"], { input });
  assert.equal(res.code, 0);
  assert.equal(res.stdout.trimEnd(), expected);
}

export async function testAsciiRender() {
  await runAscii(baseGraphInput, baseGraphExpected);
  await runAscii(baseSequenceInput, baseSequenceExpected);

  for (const fixture of asciiFixtures) {
    await runAscii(fixture.input, fixture.output);
  }

  for (const fixture of sequenceFixtures) {
    await runAscii(fixture.input, fixture.output);
  }
}
