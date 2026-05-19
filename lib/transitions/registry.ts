import type {
  EnterFunction,
  ExitFunction,
  TransitionEventCallbacks,
  TransitionRegistry,
} from "./context";
import { collectEnters, collectExits } from "./helpers";

export function createRegistry(): TransitionRegistry {
  const exitMap = new Map<string, ExitFunction>();
  const enterMap = new Map<string, EnterFunction>();
  const eventMap = new Map<string, TransitionEventCallbacks>();
  const exitResolvers = new Map<string, () => void>();
  const enterResolvers = new Map<string, () => void>();

  return {
    registerExit(id, fn) {
      exitMap.set(id, fn);
      return () => {
        exitMap.delete(id);
        exitResolvers.get(id)?.();
        exitResolvers.delete(id);
      };
    },
    registerEnter(id, fn) {
      enterMap.set(id, fn);
      return () => {
        enterMap.delete(id);
        enterResolvers.get(id)?.();
        enterResolvers.delete(id);
      };
    },
    registerEvent(id, config) {
      eventMap.set(id, config);
      return () => {
        eventMap.delete(id);
        exitResolvers.get(`evt:${id}`)?.();
        exitResolvers.delete(`evt:${id}`);
        enterResolvers.get(`evt:${id}`)?.();
        enterResolvers.delete(`evt:${id}`);
      };
    },
    runExits(info, enter, ctx, block) {
      return collectExits(exitMap, eventMap, exitResolvers, info, enter, ctx, block);
    },
    runEnters(info, ctx, exit, block, awaitBlocks) {
      return collectEnters(enterMap, eventMap, enterResolvers, info, ctx, exit, block, awaitBlocks);
    },
    hasExits() {
      if (exitMap.size > 0) return true;
      for (const config of eventMap.values()) {
        if (config.onExit) return true;
      }
      return false;
    },
    clear() {
      exitMap.clear();
      enterMap.clear();
      eventMap.clear();
      // Resolve pending promises BEFORE clearing resolver maps — this settles
      // any in-flight Promise.all chains (they'll no-op via isStale checks).
      for (const resolve of exitResolvers.values()) resolve();
      for (const resolve of enterResolvers.values()) resolve();
      exitResolvers.clear();
      enterResolvers.clear();
    },
  };
}
