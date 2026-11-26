import { test } from "node:test";
import assert from "node:assert/strict";
import { lz4Block } from "../src/binary.js";
import { lz4Literal } from "./helpers/rbxm-writer.js";

const bytes = (s) => new Uint8Array(Buffer.from(s, "latin1"));

test("lz4: literal-only block round-trips", () => {
  for (const len of [0, 1, 14, 15, 16, 270, 600]) {
    const data = new Uint8Array(len).map((_, i) => (i * 31) & 255);
    assert.deepEqual(lz4Block(new Uint8Array(lz4Literal(data)), len), data);
  }
});

test("lz4: overlapping match copies (run-length style)", () => {
  // token: 1 literal 'a', match length 4+5=9 at offset 1 -> 'a' * 10; then a final literal 'b'
  const block = new Uint8Array([0x15, 0x61, 0x01, 0x00, 0x10, 0x62]);
  assert.equal(Buffer.from(lz4Block(block, 11)).toString("latin1"), "aaaaaaaaaab");
});

test("lz4: match with offset > 1 repeats a pattern", () => {
  // literals "abc", match offset 3 length 4+2=6 -> "abcabcabc", final literal "!"
  const block = new Uint8Array([0x32, ...bytes("abc"), 0x03, 0x00, 0x10, 0x21]);
  assert.equal(Buffer.from(lz4Block(block, 10)).toString("latin1"), "abcabcabc!");
});

test("lz4: rejects corrupt blocks", () => {
  assert.throws(() => lz4Block(new Uint8Array([0x10, 0x61, 0x05, 0x00]), 5), /offset/);
  assert.throws(() => lz4Block(new Uint8Array([0x30, 0x61, 0x62, 0x63]), 2), /literals/);
  assert.throws(() => lz4Block(new Uint8Array([0x10, 0x61]), 4), /size mismatch/);
});
