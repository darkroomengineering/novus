import type {
  AnimationOptions,
  At,
  DOMKeyframesDefinition,
  ElementOrSelector,
  MotionValue,
  ObjectTarget,
  Segment,
  UnresolvedValueKeyframe,
} from "motion";

class MotionTimeline {
  sequence: Segment[] = [];

  add(
    target: ElementOrSelector,
    keyframes: DOMKeyframesDefinition,
    options: AnimationOptions & At
  ): this;
  add(target: ElementOrSelector, keyframes: DOMKeyframesDefinition): this;
  add(
    target: MotionValue,
    keyframes: UnresolvedValueKeyframe | UnresolvedValueKeyframe[],
    options: AnimationOptions & At
  ): this;
  add(
    target: MotionValue,
    options: UnresolvedValueKeyframe | UnresolvedValueKeyframe[]
  ): this;
  add<O extends {} = {}>(
    segment: O,
    target: ObjectTarget<O>,
    options: AnimationOptions & At
  ): this;
  add<O extends {} = {}>(segment: O, target: ObjectTarget<O>): this;
  // biome-ignore lint/suspicious/noExplicitAny: Hard to type this
  add(...args: any): this {
    this.sequence.push(args);
    return this;
  }
}

export function createTimeline(): MotionTimeline {
  return new MotionTimeline();
}

const tl = createTimeline();
tl.add("#box", {
  x: 100,
});
