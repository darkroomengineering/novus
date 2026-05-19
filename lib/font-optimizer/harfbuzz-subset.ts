import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// HB_MEMORY_MODE_WRITABLE — caller transfers ownership of the buffer to harfbuzz.
// We must NOT free it ourselves; harfbuzz manages its lifetime through the blob.
const HB_MEMORY_MODE_WRITABLE = 2;

interface HbExports {
  memory: WebAssembly.Memory;
  malloc(size: number): number;
  free(ptr: number): void;
  hb_blob_create(
    data: number,
    length: number,
    mode: number,
    user_data: number,
    destroy: number,
  ): number;
  hb_blob_destroy(blob: number): void;
  hb_blob_get_length(blob: number): number;
  hb_blob_get_data(blob: number, length_out: number): number;
  hb_face_create(blob: number, index: number): number;
  hb_face_destroy(face: number): void;
  hb_face_reference_blob(face: number): number;
  hb_subset_input_create_or_fail(): number;
  hb_subset_input_destroy(input: number): void;
  hb_subset_input_unicode_set(input: number): number;
  hb_set_add(set: number, codepoint: number): void;
  hb_subset_or_fail(face: number, input: number): number;
  // Emscripten runtime internals exposed as exports
  _emscripten_stack_restore?(val: number): void;
  _emscripten_stack_alloc?(sz: number): number;
  emscripten_stack_get_current?(): number;
  __wasm_call_ctors?(): void;
}

let instancePromise: Promise<HbExports> | null = null;

function getWasmPath(): string {
  // harfbuzzjs's package.json restricts `exports` to "." only, so subpath
  // resolution like "harfbuzzjs/dist/harfbuzz-subset.wasm" fails. Resolve the
  // main entry instead and derive the wasm path from its directory.
  const require = createRequire(import.meta.url);
  const mainPath = require.resolve("harfbuzzjs");
  return join(dirname(mainPath), "harfbuzz-subset.wasm");
}

// Emscripten-compiled WASM binaries need import stubs for env + wasi_snapshot_preview1.
// These are the minimal stubs that satisfy the linker without side effects.
function makeImports(memoryRef: { current: WebAssembly.Memory | null }): WebAssembly.Imports {
  const env = {
    emscripten_resize_heap(requestedSize: number): number {
      const mem = memoryRef.current;
      if (!mem) return 0;
      const pages = Math.ceil((requestedSize - mem.buffer.byteLength) / 65536);
      if (pages <= 0) return 1;
      try {
        mem.grow(pages);
        return 1;
      } catch {
        return 0;
      }
    },
    proc_exit(_code: number): void {
      throw new Error(`harfbuzz WASM called proc_exit(${_code})`);
    },
    // Abort stubs — harfbuzz subset shouldn't hit these in normal operation.
    _abort_js(): void {
      throw new Error("harfbuzz WASM aborted");
    },
    _emscripten_runtime_keepalive_clear(): void {},
    _setitimer_js(_which: number, _timeout_ms: number): number {
      return 0;
    },
  };

  // wasi_snapshot_preview1 stubs — Emscripten links these even when unused.
  const wasi_snapshot_preview1 = {
    fd_write(_fd: number, _iovs: number, _iovs_len: number, _nwritten: number): number {
      return 0;
    },
    fd_close(_fd: number): number {
      return 0;
    },
    fd_seek(
      _fd: number,
      _offset_low: number,
      _offset_high: number,
      _whence: number,
      _newoffset: number,
    ): number {
      return 0;
    },
    environ_sizes_get(_count: number, _size: number): number {
      return 0;
    },
    environ_get(_environ: number, _environ_buf: number): number {
      return 0;
    },
  };

  return { env, wasi_snapshot_preview1 };
}

async function loadInstance(): Promise<HbExports> {
  const wasmBytes = await readFile(getWasmPath());

  // We need a reference the env stubs can close over before the instance exists.
  const memoryRef: { current: WebAssembly.Memory | null } = { current: null };
  const imports = makeImports(memoryRef);

  const { instance } = await WebAssembly.instantiate(wasmBytes, imports);
  const exports = instance.exports as unknown as HbExports;

  memoryRef.current = exports.memory;

  // Run Emscripten's static constructors if present.
  exports.__wasm_call_ctors?.();

  return exports;
}

function getInstance(): Promise<HbExports> {
  if (!instancePromise) instancePromise = loadInstance();
  return instancePromise;
}

export async function subsetTtf(input: Uint8Array, codepoints: number[]): Promise<Uint8Array> {
  const hb = await getInstance();

  // Copy font bytes into WASM heap.
  const fontPtr = hb.malloc(input.byteLength);
  if (fontPtr === 0) throw new Error("harfbuzz: malloc failed for font buffer");
  new Uint8Array(hb.memory.buffer).set(input, fontPtr);

  const blobIn = hb.hb_blob_create(fontPtr, input.byteLength, HB_MEMORY_MODE_WRITABLE, 0, 0);

  if (blobIn === 0) {
    hb.free(fontPtr);
    throw new Error("harfbuzz: hb_blob_create returned null");
  }

  const face = hb.hb_face_create(blobIn, 0);
  hb.hb_blob_destroy(blobIn);

  if (face === 0) throw new Error("harfbuzz: hb_face_create returned null");

  const subsetInput = hb.hb_subset_input_create_or_fail();
  if (subsetInput === 0) {
    hb.hb_face_destroy(face);
    throw new Error("harfbuzz: hb_subset_input_create_or_fail returned null");
  }

  const unicodeSet = hb.hb_subset_input_unicode_set(subsetInput);
  for (const cp of codepoints) {
    hb.hb_set_add(unicodeSet, cp);
  }

  let subsetFace = 0;
  try {
    subsetFace = hb.hb_subset_or_fail(face, subsetInput);
  } finally {
    hb.hb_subset_input_destroy(subsetInput);
    hb.hb_face_destroy(face);
  }

  if (subsetFace === 0) {
    throw new Error("harfbuzz: hb_subset_or_fail returned null — subsetting failed");
  }

  try {
    const blobOut = hb.hb_face_reference_blob(subsetFace);
    if (blobOut === 0) {
      throw new Error("harfbuzz: hb_face_reference_blob returned null");
    }
    try {
      const length = hb.hb_blob_get_length(blobOut);
      const dataPtr = hb.hb_blob_get_data(blobOut, 0);
      // slice() creates an owned copy — safe to destroy the blob right after.
      return new Uint8Array(hb.memory.buffer, dataPtr, length).slice();
    } finally {
      hb.hb_blob_destroy(blobOut);
    }
  } finally {
    hb.hb_face_destroy(subsetFace);
  }
}
