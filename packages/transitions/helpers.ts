import type {
  CleanupFunction,
  EnterFunction,
  ExitFunction,
  TransitionCtx,
  TransitionEventCallbacks,
  TransitionInfo,
} from "./context";

// ---------------------------------------------------------------------------
// Exit handling
// ---------------------------------------------------------------------------

export interface ExitHandle {
  promise: Promise<void>;
  cleanup: CleanupFunction | null;
}

export function wrapExit(
  id: string,
  fn: ExitFunction,
  resolvers: Map<string, () => void>,
  info: TransitionInfo,
  enter: () => void,
  ctx: TransitionCtx,
  block: (promise: Promise<unknown>) => void,
): ExitHandle {
  let cleanup: CleanupFunction | null = null;

  const promise = new Promise<void>((resolve) => {
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      resolvers.delete(id);
      resolve();
    };

    // Resolve any stale resolver for this id (prevents hanging promises from interrupted transitions)
    resolvers.get(id)?.();
    resolvers.set(id, done);

    try {
      const result = fn({
        done,
        enter,
        info,
        ctx,
        block,
      });
      if (typeof result === "function") {
        cleanup = result;
      }
    } catch (err) {
      console.warn("[TransitionOutlet] Exit error:", err);
      done();
    }
  });

  return {
    promise,
    cleanup,
  };
}

// ---------------------------------------------------------------------------
// Enter handling
// ---------------------------------------------------------------------------

export interface EnterHandle {
  promise: Promise<void>;
  cleanup: CleanupFunction | null;
}

export function wrapEnter(
  id: string,
  fn: EnterFunction,
  resolvers: Map<string, () => void>,
  info: TransitionInfo,
  ctx: TransitionCtx,
  exit: () => void,
  block: (promise: Promise<unknown>) => void,
  awaitBlocks: () => Promise<void>,
): EnterHandle {
  let cleanup: CleanupFunction | null = null;

  const promise = new Promise<void>((resolve) => {
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      resolvers.delete(id);
      resolve();
    };

    // Resolve any stale resolver for this id (prevents hanging promises from interrupted transitions)
    resolvers.get(id)?.();
    resolvers.set(id, done);

    try {
      const result = fn({
        done,
        exit,
        info,
        ctx,
        block,
        awaitBlocks,
      });
      if (typeof result === "function") {
        cleanup = result;
      }
    } catch (err) {
      console.warn("[TransitionOutlet] Enter error:", err);
      done();
    }
  });

  return {
    promise,
    cleanup,
  };
}

// ---------------------------------------------------------------------------
// Collectors
// ---------------------------------------------------------------------------

export interface CollectedHandle {
  promise: Promise<void>;
  cleanups: CleanupFunction[];
}

export function collectExits(
  exitMap: Map<string, ExitFunction>,
  eventMap: Map<string, TransitionEventCallbacks>,
  resolvers: Map<string, () => void>,
  info: TransitionInfo,
  enter: () => void,
  ctx: TransitionCtx,
  block: (promise: Promise<unknown>) => void,
): CollectedHandle {
  const cleanups: CleanupFunction[] = [];
  const promises: Array<Promise<void>> = [];

  for (const [id, fn] of exitMap) {
    const h = wrapExit(id, fn, resolvers, info, enter, ctx, block);
    promises.push(h.promise);
    if (h.cleanup) cleanups.push(h.cleanup);
  }

  for (const [id, config] of eventMap) {
    if (config.onExit) {
      const h = wrapExit(`evt:${id}`, config.onExit, resolvers, info, enter, ctx, block);
      promises.push(h.promise);
      if (h.cleanup) cleanups.push(h.cleanup);
    }
  }

  const promise = promises.length > 0 ? Promise.all(promises).then(() => {}) : Promise.resolve();

  return {
    promise,
    cleanups,
  };
}

export function collectEnters(
  enterMap: Map<string, EnterFunction>,
  eventMap: Map<string, TransitionEventCallbacks>,
  resolvers: Map<string, () => void>,
  info: TransitionInfo,
  ctx: TransitionCtx,
  exit: () => void,
  block: (promise: Promise<unknown>) => void,
  awaitBlocks: () => Promise<void>,
): CollectedHandle {
  const cleanups: CleanupFunction[] = [];
  const promises: Array<Promise<void>> = [];

  for (const [id, fn] of enterMap) {
    const h = wrapEnter(id, fn, resolvers, info, ctx, exit, block, awaitBlocks);
    promises.push(h.promise);
    if (h.cleanup) cleanups.push(h.cleanup);
  }

  for (const [id, config] of eventMap) {
    if (config.onEnter) {
      const h = wrapEnter(
        `evt:${id}`,
        config.onEnter,
        resolvers,
        info,
        ctx,
        exit,
        block,
        awaitBlocks,
      );
      promises.push(h.promise);
      if (h.cleanup) cleanups.push(h.cleanup);
    }
  }

  const promise = promises.length > 0 ? Promise.all(promises).then(() => {}) : Promise.resolve();

  return {
    promise,
    cleanups,
  };
}

/** Run all cleanup functions synchronously. */
export function runCleanups(cleanups: CleanupFunction[]): void {
  for (const fn of cleanups) {
    try {
      fn();
    } catch (err) {
      console.warn("[TransitionOutlet] Cleanup error:", err);
    }
  }
}
