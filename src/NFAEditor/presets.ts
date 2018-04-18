import {IDefinition} from '../Core/NFA';

export interface IPreset {
	definition: IDefinition,
	description: string,
	examples: string[],
	regex: string,
};

const presets: IPreset[] = [
	{
		definition: {
			accept: [1, 2],
			n: 3,
			names: ["Start", "a", "b"],
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
		description: "Accepts strings that are an alternating sequence of b and a.",
		examples: ["aba", "baba", "abababa"],
		regex: "a?(ba)*b?",
	},
	{
		definition: {
			accept: [3],
			n: 5,
			names: ["Start", "First a", "Any b", "a after b", "Anything else", "Unreachable"],
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
		description: "Accepts strings that start with ab and end with ba.",
		examples: ["aba", "abba", "abababa"],
		regex: "a?(ba)*b?",
	},
];

export default presets;
