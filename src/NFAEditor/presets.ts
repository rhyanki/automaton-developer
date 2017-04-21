import {Definition} from '../Core/NFA';

export type Preset = {
	description: string,
	examples: string[],
	regex: string,
	definition: Definition,
};

const presets: Preset[] = [
	{
		description: "Accepts strings that are an alternating sequence of b and a.",
		examples: ["aba", "baba", "abababa"],
		regex: "a?(ba)*b?",
		definition: {
			accept: [1, 2],
			names: ["Start", "a", "b"],
			n: 3,
			transitions: [
				[
					[1, "a"],
					[2, "b"],
				],
				[
					[2, "b"],
				],
				[
					[1, "a"],
				],
			],
		},
	},
	{
		description: "Accepts strings that start with ab and end with ba.",
		examples: ["aba", "abba", "abababa"],
		regex: "a?(ba)*b?",
		definition: {
			accept: [3],
			names: ["Start", "First a", "Any b", "a after b", "Anything else", "Unreachable"],
			n: 5,
			transitions: [
				[
					[1, "a"],
				],
				[
					[2, "b"],
				],
				[
					[2, "b"],
					[3, "a"],
				],
				[
					[2, "b"],
					[4, "a"],
				],
				[
					[2, "b"],
					[4, "a"],
				],
			],
		},
	},
];

export default presets;