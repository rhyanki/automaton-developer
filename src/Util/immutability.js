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
 * Sets and Maps have their methods overridden to return mutable copies of themselves
 * instead if they would be modified.
 * For example:
 * x = new Map([1, 1]);
 * y = x.set(1, 1); // x === y
 * y = x.set(1, 2); // x !== y
 * z = y.set(1, 3); // y === z
 *
 * Return the same item.
 */
function freeze(item) {
	if (item._frozen) {
		return item;
	}
	if (item instanceof Map) {
		item.set = immutable_map_set;
		item.clear = immutable_map_clear;
		item.delete = immutable_map_delete;
	} else if (item instanceof Set) {
		item.add = immutable_set_add;
		item.clear = immutable_set_clear;
		item.delete = immutable_set_delete;
	}
	item._frozen = true;
	return Object.freeze(item);
}

function immutable_map_set(key, value) {
	console.log("set() called on frozen Map");
	if (this.get(key) === value) {
		return this;
	}
	const mapCopy = new Map(this);
	mapCopy.set(key, value);
	return mapCopy;
}

function immutable_map_clear() {
	console.log("clear() called on frozen Map");
	if (this.size === 0) {
		return this;
	}
	return new Map();
}

function immutable_map_delete(key) {
	console.log("delete() called on frozen Map");
	if (!this.has(key)) {
		return this;
	}
	const mapCopy = new Map(this);
	mapCopy.delete(key);
	return mapCopy;
}

function immutable_set_add(item) {
	console.log("add() called on frozen Set");
	if (this.has(item)) {
		return this;
	}
	const setCopy = new Set(this);
	setCopy.add(item);
	return setCopy;
}

function immutable_set_clear() {
	console.log("clear() called on frozen Set");
	if (this.size === 0) {
		return this;
	}
	return new Set();
}

function immutable_set_delete(item) {
	console.log("delete() called on frozen Set");
	if (!this.has(item)) {
		return this;
	}
	const setCopy = new Set(this);
	setCopy.delete(item);
	return setCopy;
}

export {copy, freeze};
