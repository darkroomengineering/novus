import { MotionValue, type AnimationOptions, type At, type DOMKeyframesDefinition, type ElementOrSelector, type ObjectTarget, type Segment, type SequenceOptions, type UnresolvedValueKeyframe } from "motion";

class MotionTimeline {
	sequence: Segment[] = []

	add(target: ElementOrSelector, keyframes: DOMKeyframesDefinition, options: AnimationOptions & At): this
	add(target: ElementOrSelector, keyframes: DOMKeyframesDefinition): this
	add(target: MotionValue, keyframes: UnresolvedValueKeyframe | UnresolvedValueKeyframe[], options: AnimationOptions & At): this
	add(target: MotionValue, options: UnresolvedValueKeyframe | UnresolvedValueKeyframe[]): this
	add<O extends {} = {}>(segment: O, target:ObjectTarget<O>, options: AnimationOptions & At): this
	add<O extends {} = {}>(segment:O, target:ObjectTarget<O>):this
	add(...args: any): this
	{
		this.sequence.push(args)
		return this
	}


}

export function createTimeline(): MotionTimeline {
	return new MotionTimeline()
}

const tl = createTimeline()
tl.add("#box", {
	x: 100,
})

