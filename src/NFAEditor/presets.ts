import {Definition} from '../Core/NFA';

export type Preset = {
	description: string,
	definition: Definition,
};

const presets: Preset[] = [
	{
		description: "Accepts strings that are an alternating sequence of b and a. E.g. aba, baba, abababa. Regex: a?(ba)*b?",
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
		description: "Accepts strings that start with ab and end with ba. Regex: ab(.*b)?a",
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