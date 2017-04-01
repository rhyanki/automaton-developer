import React, { Component } from 'react';
import './VisualEditor.css';

class Vector {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		Object.freeze(this);
	}

	/**
	 * Return the direction/angle of the vector from (0, 0).
	 */
	angle() {
		return Math.atan2(this.y, this.x);
	}

	/**
	 * Return the angle to another vector.
	 */
	angleTo(v) {
		return v.minus(this).angle();
	}

	/**
	 * Multiply the vector by a scalar.
	 * @param {Number} s The scalar.
	 */
	by(s) {
		return new Vector(this.x * s, this.y * s);
	}

	/**
	 * Return the distance to another vector.
	 * @param {Vector} v The other vector.
	 */
	distanceTo(v) {
		return this.minus(v).length();
	}

	/**
	 * Return the length/magnitude of the vector.
	 */
	length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	/**
	 * Return the midpoint between this vector and another.
	 * @param {Vector} v The vector to subtract.
	 */
	midpoint(v) {
		return new Vector((this.x + v.x) / 2, (this.y + v.y) / 2)
	}

	/**
	 * Subtract another vector from the vector.
	 * @param {Vector} v The vector to subtract.
	 */
	minus(v) {
		return new Vector(this.x - v.x, this.y - v.y);
	}

	/**
	 * Add the vector to another vector.
	 * @param {Vector} v The vector to add.
	 */
	plus(v) {
		return new Vector(this.x + v.x, this.y + v.y);
	}

	plusX(x) {
		return new Vector(this.x + x, this.y);
	}

	plusY(y) {
		return new Vector(this.x, this.y + y);
	}

	*[Symbol.iterator]() {
		yield this.x;
		yield this.y;
	}
}

class VisualEditor extends Component {
	constructor(props) {
		super(props);

		this.width = 600; // Placeholders
		this.height = 600;

		this.STATE_RADIUS = 50;
		this.NAME_SIZE = 14;

		this.dragging = 0; // The state currently being dragged
		this.dragPos = null;

		this.state = {
			positions: new Map(),
		};
	}

	componentDidMount() {
		this.resetPositions();
	}

	componentDidUpdate() {
		//this.drawTransitions();
	}

	startDragging(e, state) {
		this.dragging = state;
		this.dragPos = new Vector(e.clientX, e.clientY);
	}

	maybeDrag(e) {
		if (!this.dragging) {
			return;
		}
		const newDragPos = new Vector(e.clientX, e.clientY);
		const diff = newDragPos.minus(this.dragPos);
		this.setState((state, props) => {
			const newPositions = new Map(state.positions);
			const oldPos = state.positions.get(this.dragging);
			const newPos = oldPos.plus(diff);
			newPositions.set(this.dragging, newPos);
			return {
				positions: newPositions,
			};
		});
		this.dragPos = newDragPos;
	}

	stopDragging() {
		// When the mouse is up, stop dragging
		this.dragging = 0;
	}

	// Return a control point, which is offset perpendicularly from the midpoint of two points.
	controlPoint(start, end, offset) {
		const mid = start.midpoint(end);
		let angle = start.angleTo(end);
		angle += Math.PI / 2; // Now make it perpendicular
		return new Vector(
			Math.floor(mid.x - Math.cos(angle) * offset),
			Math.floor(mid.y - Math.sin(angle) * offset)
		);
	}

	// Return a position on a quadratic curve at a given t value
	quadraticCurveAt(start, control, end, t) {
		// This is just the quadratic Bezier formula
		let ret = start.by(Math.pow(1 - t, 2));
		ret = ret.plus(control.by(2 * (1 - t) * t));
		ret = ret.plus(end.by(t * t));
		return ret;
	}

	promptEditState(state) {
		if (this.state.dragging) {
			return;
		}
		const newName = window.prompt("Enter a state name.", this.props.dfa.name(state));
		if (newName) {
			this.props.handleUpdateStateName(state, newName);
		}
	}

	resetPositions() {
		this.setState((state, props) => {
			const positions = new Map(); // Stores the positions of each state
			const numStates = props.dfa.numStates;

			let angle = Math.PI; // The angle at which the next state should be placed
			const offset = Math.min(this.width, this.height) * 0.3; // The distance each state should start from the centre
			const direction = -1; // -1 for clockwise, 1 for anticlockwise

			for (const state of props.dfa.states()) {
				const x = Math.round(this.width * 0.5 + Math.cos(angle) * offset);
				const y = Math.round(this.height * 0.5 - Math.sin(angle) * offset);
				positions.set(state, new Vector(x, y));
				angle += Math.PI * 2 / numStates * direction;
			}
			return {positions: positions};
		});
	}

	x(state) {
		return this.state.positions.get(state).x;
	}

	y(state) {
		return this.state.positions.get(state).y;
	}

	pos(state) {
		return this.state.positions.get(state);
	}

	/**
	 * Return a polyline consisting of two short lines in the shape of an arrowhead.
	 * @param {Vector} pos The position of the tip of the arrow.
	 * @param {Number} angle The angle at which the arrow is pointing. 0 = left, pi / 2 = down.
	 * @param {Number} size The length of each line.
	 * @param {Number} theta The angle between the arrow's lines. Should be less than pi.
	 */
	renderArrowHead(pos, angle, size, theta) {
		const t1 = angle - theta / 2;
		const t2 = angle + theta / 2;

		let points = "" + (pos.x - size * Math.cos(t1)) + "," + (pos.y - size * Math.sin(t1));
		points += " " + pos.x + "," + pos.y;
		points += " " + (pos.x - size * Math.cos(t2)) + "," + (pos.y - size * Math.sin(t2));

		return <polyline className="head" points={points} />
	}

	/**
	 * Return an SVG group for a transition.
	 */
	renderTransition(origin, target, symbols) {
		if (origin === target) {
			// Will need to make special case for self-connections
			return null;
		}
		const start = this.pos(origin);
		const end = this.pos(target);
		let d = "M" + start.x + " " + start.y;

		let control;
		let symbolsPos;

		// If there is a two-way connection, draw curved lines
		if (this.props.dfa.transition(target, origin)) {
			control = this.controlPoint(start, end, 30);
			d += " Q " + control.x + " " + control.y + ", " + end.x + " " + end.y;
			symbolsPos = this.controlPoint(start, end, 25);
		} else {
			d += " L " + end.x + " " + end.y;
			control = start.midpoint(end);
			symbolsPos = this.controlPoint(start, end, 10);
		}

		const angle = start.angleTo(end);

		// Also render the arrow head, unless the states are overlapping (otherwise funny things happen)
		let arrowHead = null;
		if (start.distanceTo(end) > this.STATE_RADIUS) {
			const arrowHeadPos = this.quadraticCurveAt(start, control, end, 1 - this.STATE_RADIUS / start.distanceTo(end));
			arrowHead = this.renderArrowHead(arrowHeadPos, angle, 10, Math.PI / 3);
		}

		let textAnchor;
		if (angle > 0) {
			textAnchor = "start";
		} else {
			textAnchor = "end";
		}

		return (<g
			key={[origin, target]}
			className="transition"
		>
			<g className="arrow">
				<path className="shaft" d={d} />;
				{arrowHead}
			</g>
			<text
				className="symbol"
				x={symbolsPos.x}
				y={symbolsPos.y + 5}
				textAnchor={textAnchor}
				onClick={() => this.props.promptUpdateTransitionSymbols(origin, target)}
			>{symbols.toString()}</text>
		</g>)
	}

	render() {
		const states = [];
		const transitions = [];
		const dfa = this.props.dfa;
		for (const [state, pos] of this.state.positions) {
			states.push(<g
				key={state}
				transform={"translate(" + pos.x + ", " + pos.y + ")"}
				onMouseDown={(e) => {this.startDragging(e, state)}}
				className={'state ' + (!dfa.reachable(state) ? 'state-unreachable ' : '') + (dfa.accept(state) ? 'state-accept ' : '') + (!dfa.generating(state) ? 'state-nongenerating ' : '')}
				draggable={false}
				onDragStart={() => {return false;}}
			>
				<circle
					name={state}
					style={{stroke: "black", strokeWidth: 1}}
					r={this.STATE_RADIUS}
				/>
				<foreignObject
					x={-0.5 * this.STATE_RADIUS}
					y={0.4 * this.STATE_RADIUS}
					width={this.STATE_RADIUS}
					height={this.STATE_RADIUS}
				>
					<i
						className="fa fa-pencil btn-edit-state"
						onClick={() => this.promptEditState(state)}
					></i>
					<i
						className="fa fa-check btn-edit-state"
						onClick={() => this.props.handleToggleAccept(state)}
					></i>
				</foreignObject>
				<text
					fontFamily="Verdana"
					x={0}
					y={0}
					textAnchor="middle"
				>{dfa.name(state)}</text>
			</g>);
			
			// Render the transitions too
			for (const [target, symbols] of dfa.transitions(state)) {
				transitions.push(this.renderTransition(state, target, symbols));
			}
		}

		return (
			<svg
				ref="svg"
				className="VisualEditor"
				width={this.width}
				height={this.height}
				onMouseMove={(e) => {this.maybeDrag(e)}}
				onMouseLeave={() => {this.stopDragging()}}
				onMouseUp={() => {this.stopDragging()}}
			>
				{transitions}
				{states}
			</svg>
		);
	}
}

export default VisualEditor;
