import {NFATemplate} from '../Core/NFA';

export type Preset = {
	description: string,
	template: NFATemplate,
}[];

const presets = [
	{
		description: "Accepts strings that are an alternating sequence of b and a. E.g. aba, baba, abababa. Regex: a?(ba)*b?",
		template: {
			start: 0,
			accepts: [1, 2],
			states: ["Start", "a", "b"],
			transitions: [
				[0, 1, "a"],
				[0, 2, "b"],
				[1, 2, "b"],
				[2, 1, "a"],
			],
		},
	},
	{
		description: "Accepts strings that start with ab and end with ba. Regex: ab(.*b)?a",
		template: {
			start: 0,
			accepts: [3],
			states: ["Start", "First a", "Any b", "a after b", "Anything else", "Unreachable"],
			transitions: [
				[0, 1, "a"],
				[1, 2, "b"],
				[2, 2, "b"],
				[2, 3, "a"],
				[3, 2, "b"],
				[3, 4, "a"],
				[4, 2, "b"],
				[4, 4, "a"],
				[5, 5, "a b \\n \\\\"],
			],
		},
	},
] as Preset;

export default presets;