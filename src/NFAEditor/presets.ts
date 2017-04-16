import {NFATemplate} from '../Core/NFA';

export type Preset = {
	description: string,
	template: NFATemplate,
}[];

const presets = [
	{
		description: "Accepts strings that start with ab and end with ba.",
		template: {
			start: 1,
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
		}
	},
];

export default presets;