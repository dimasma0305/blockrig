// Chatterbox (Resemble AI, MIT) in plain Node: the onnx-community ONNX export run with onnxruntime-node, no Python.
// Ported from the export's reference loop (speech encoder -> token embeddings with `exaggeration` -> KV-cached Llama
// -> conditional decoder at 24 kHz), with seeded temperature + min-p sampling and a repetition penalty (as the Python
// package does) instead of greedy decoding, so a line can be rendered as several takes, and classifier-free guidance
// (cfg_weight) added back on top of the export (it ships without it).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as ort from "onnxruntime-node";
import { AutoTokenizer, env } from "@huggingface/transformers";

export const SR = 24000;
const REPO = "onnx-community/chatterbox-ONNX", START = 6561, STOP = 6562;
const CACHE = path.join(os.homedir(), ".cache", "chatterbox-onnx");
env.cacheDir = path.join(os.homedir(), ".cache", "transformers-js");

async function fetchFile(rel) {
  const out = path.join(CACHE, rel);
  if (fs.existsSync(out) && fs.statSync(out).size > 0) return out;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  process.stdout.write(`downloading ${rel}... `);
  const r = await fetch(`https://huggingface.co/${REPO}/resolve/main/${rel}`);
  if (!r.ok) throw new Error(`${rel}: ${r.status}`);
  const tmp = out + ".part", f = fs.createWriteStream(tmp);
  for await (const chunk of r.body) f.write(chunk);
  await new Promise((ok) => f.end(ok)); fs.renameSync(tmp, out);
  console.log(`${(fs.statSync(out).size / 1e6).toFixed(0)} MB`);
  return out;
}
async function session(name) {
  const file = await fetchFile(`onnx/${name}.onnx`); await fetchFile(`onnx/${name}.onnx_data`);
  return ort.InferenceSession.create(file, { executionProviders: ["cpu"], graphOptimizationLevel: "all" });
}
const i64 = (arr, dims) => new ort.Tensor("int64", BigInt64Array.from(arr.map((v) => BigInt(v))), dims);
function concat1(a, b) { // concatenate [1, n, h] float tensors along axis 1
  const h = a.dims[2], out = new Float32Array(a.data.length + b.data.length); out.set(a.data); out.set(b.data, a.data.length);
  return new ort.Tensor("float32", out, [1, a.dims[1] + b.dims[1], h]);
}
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export async function loadChatterbox({ lm = "language_model_q4" } = {}) {
  const [enc, emb, llm, dec] = [await session("speech_encoder"), await session("embed_tokens"), await session(lm), await session("conditional_decoder")];
  const tok = await AutoTokenizer.from_pretrained(REPO);
  const layers = llm.inputNames.filter((n) => /^past_key_values\.\d+\.key$/.test(n)).length;
  const kvHeads = 16, headDim = 64;
  let voice = null;
  return {
    /** The voice to copy: mono Float32Array at 24 kHz (encoded once, reused for every line). */
    async setVoice(audio) {
      const o = await enc.run({ audio_values: new ort.Tensor("float32", audio, [1, audio.length]) });
      const [condEmb, promptTok, xvec, feat] = enc.outputNames.map((n) => o[n]);
      voice = { condEmb, promptTok, xvec, feat };
    },
    /** One take: Float32Array at 24 kHz. */
    tokens: (text) => Array.from(tok(text).input_ids.data, Number),
    // cfg (classifier-free guidance, as in Chatterbox's own inference): a second copy of the sequence with the text
    // embeddings zeroed runs alongside (one batch of 2); each step mixes logits = cond + cfg * (cond - uncond), which
    // keeps the model on the text (without it, takes sometimes slur words or babble). cfg 0 = off.
    async speak(text, { exaggeration = 0.5, cfg = 0.5, temperature = 0.8, minP = 0.05, repetitionPenalty = 1.2, seed = 1, maxTokens = 600 } = {}) {
      if (!voice) throw new Error("setVoice first");
      const B = cfg > 0 ? 2 : 1;
      const ids = Array.from(tok(text).input_ids.data, Number);
      const pos = ids.map((v, i) => (v >= START ? 0 : i - 1));
      const ex = new ort.Tensor("float32", Float32Array.from([exaggeration]), [1]);
      let one = (await emb.run({ input_ids: i64(ids, [1, ids.length]), position_ids: i64(pos, [1, pos.length]), exaggeration: ex }))[emb.outputNames[0]];
      one = concat1(voice.condEmb, one); // (the tokenizer already ends the text with the speech-start token)
      const H = one.dims[2], nc = voice.condEmb.dims[1];
      const batch = (t) => { // [1, n, H] -> [B, n, H]; the second copy (unconditional) gets its text rows zeroed
        if (B === 1) return t;
        const n = t.dims[1], out = new Float32Array(2 * n * H); out.set(t.data); out.set(t.data, n * H);
        return new ort.Tensor("float32", out, [2, n, H]);
      };
      let embeds = batch(one);
      if (B === 2) for (let i = 0; i < ids.length; i++) if (ids[i] < START) embeds.data.fill(0, (one.dims[1] + nc + i) * H, (one.dims[1] + nc + i + 1) * H);
      const past = {};
      for (let l = 0; l < layers; l++) for (const kv of ["key", "value"]) past[`past_key_values.${l}.${kv}`] = new ort.Tensor("float32", new Float32Array(0), [B, kvHeads, 0, headDim]);
      let seen = one.dims[1];
      const gen = [START], r = rng(seed);
      for (let step = 0; step < maxTokens; step++) {
        const feeds = { inputs_embeds: embeds, attention_mask: i64(new Array(B * seen).fill(1), [B, seen]), ...past };
        const out = await llm.run(feeds);
        const logits = out[llm.outputNames[0]], V = logits.dims[2], S = logits.dims[1];
        const cond = logits.data.subarray((S - 1) * V, S * V), sc = Float32Array.from(cond);
        if (B === 2) { const un = logits.data.subarray((2 * S - 1) * V, 2 * S * V); for (let i = 0; i < V; i++) sc[i] = cond[i] + cfg * (cond[i] - un[i]); }
        for (const t of new Set(gen)) sc[t] = sc[t] < 0 ? sc[t] * repetitionPenalty : sc[t] / repetitionPenalty;
        // temperature + min-p sampling (seeded)
        let mx = -Infinity; for (let i = 0; i < V; i++) { sc[i] /= temperature; if (sc[i] > mx) mx = sc[i]; }
        let sum = 0; for (let i = 0; i < V; i++) { sc[i] = Math.exp(sc[i] - mx); sum += sc[i]; }
        let kept = 0; for (let i = 0; i < V; i++) { if (sc[i] / sum < minP) sc[i] = 0; else kept += sc[i]; }
        let u = r() * kept, next = 0; for (let i = 0; i < V; i++) { u -= sc[i]; if (u <= 0 && sc[i] > 0) { next = i; break; } }
        gen.push(next);
        if (next === STOP) break;
        for (const name of llm.outputNames.slice(1)) past[name.replace(/^present/, "past_key_values")] = out[name];
        embeds = batch((await emb.run({ input_ids: i64([next], [1, 1]), position_ids: i64([step + 1], [1, 1]), exaggeration: ex }))[emb.outputNames[0]]);
        seen += 1;
      }
      const speech = gen.slice(1).filter((t) => t !== STOP && t < START);
      const prompt = Array.from(voice.promptTok.data, Number);
      const wav = await dec.run({ speech_tokens: i64([...prompt, ...speech], [1, prompt.length + speech.length]), speaker_embeddings: voice.xvec, speaker_features: voice.feat });
      return Float32Array.from(wav[dec.outputNames[0]].data);
    },
  };
}
