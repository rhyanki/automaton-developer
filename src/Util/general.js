/**
 * defaults - Set default values for an opts object passed as a function parameter.
 *
 * @param {Object} opts - The opts object passed into your function.
 * @param {Object} defs - An object containing expected opts keys and their default values.
 * @param {Boolean} [overwrite = true] - Whether to overwrite the original opts object.
 * @returns {Object} The new opts.
 */
function defaults(opts, defs, overwrite) {
	if (overwrite !== undefined && !overwrite) {
		let newOpts = {};
		for (const i in opts) {
			newOpts[i] = opts[i];
		}
		opts = newOpts;
	}
	for (var i in defs) {
		if (opts[i] === undefined) {
			opts[i] = defs[i];
		}
	}
	return opts;
}

export {defaults};