/**
 * defaults - Set default values for an opts object passed as a function parameter.
 *
 * @param opts  The opts object passed into your function.
 * @param defs  An object containing expected opts keys and their default values.
 * @param overwrite  Whether to overwrite the original opts object.
 * @returns The new opts.
 */
function defaults<O extends {}, D extends {}>(opts: O, defs: D, overwrite: boolean = true): O & D {
	let result = opts as O & D;
	if (overwrite !== undefined && !overwrite) {
		result = {} as O & D;
		for (const i in opts) {
			if (opts.hasOwnProperty(i)) {
				(result as any)[i] = opts[i];
			}
		}
	}
	for (const i in defs) {
		if (defs.hasOwnProperty(i) && (result as any)[i] === undefined) {
			(result as any)[i] = defs[i];
		}
	}
	return result;
}

export {defaults};
