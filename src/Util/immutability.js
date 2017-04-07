/**
 * Create a shallow, mutable copy of an array, plain object, Set or Map.
 */
function copy(item) {
	if (item instanceof Array) {
		return item.slice(0);
	}
	if (item instanceof Map) {
		return new Map(item);
	}
	if (item instanceof Set) {
		return new Set(item);
	}
	var newObj = {};
	for (const k in item) {
		newObj[k] = item[k];
	}
	newObj._frozen = undefined;
	return newObj;
}

/**
 * Make an array, plain object, Set or Map (shallowly) immutable.
 * Sets and Maps have their methods overridden to return copies of themselves instead.
 * Return the same item.
 */
function freeze(item) {
	if (item._frozen) {
		return item;
	}
	if (item instanceof Map) {
		item.set = Map_set;
		item.clear =
		item.set = item.clear = item.delete = function() {
			throw new Error("Cannot modify frozen Map.");
		}
	} else if (item instanceof Set) {
		item.add = item.clear = item.delete = function() {
			throw new Error("Cannot modify frozen Set.");
		}
	}
	item._frozen = true;
	return Object.freeze(item);
}

function Map_set(...args) {
	console.log("set() called on frozen Map");
	const setCopy = copy(this);
	setCopy.set(...args);
	return setCopy;
}

function Map_clear(...args) {
	console.log("clear() called on frozen Map");
	const setCopy = copy(this);
	setCopy.clear(...args);
	return setCopy;
}

export {copy, freeze};
