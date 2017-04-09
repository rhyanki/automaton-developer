import React, {PureComponent} from 'react';
import {Map} from 'immutable';
import LabelledArrow from './LabelledArrow.js';
import {Vector, perpendicularOffset, quadraticCurveAt} from '../../Util/math.js';
import './VisualEditor.css';

class VisualEditor extends PureComponent {
	constructor(props) {
		super(props);

		this.width = 600; // Placeholders
		this.height = 600;

		this.DEFAULT_POS = new Vector(this.width / 2, this.height / 2);

		this.STATE_RADIUS = 50;
		this.NAME_SIZE = 14;

		this.state = {
			positions: Map(),
			cursorPos: null,
			draggingState: 0,
			drawingTransitionOrigin: 0,
			drawingTransitionTarget: 0,
		};
		Object.freeze(this.state);
	}

	componentDidMount() {
		this.resetPositions();
	}

	componentDidUpdate() {
		console.log("VisualEditor updated.");
		//this.drawTransitions();
	}

	componentWillReceiveProps(nextProps) {
		if (this.props.nfa.states === nextProps.nfa.states) {
			return;
		}
		// Check if any states have been added
		for (const state of nextProps.nfa.states) {
			if (!this.state.positions.has(state)) {
				// Put them in the center of the editor by default
				this.setState((prevState, prevProps) => {
					return {
						positions: prevState.positions.set(state, this.DEFAULT_POS)
					}
				});
			}
		}
	}

	/**
	 * Start dragging a state.
	 * @param {Event} state
	 * @param {Number} cursorPos The initial cursor position.
	 */
	dragStateStart(state, cursorPos) {
		this.setState({
			cursorPos: cursorPos,
			draggingState: state,
		});
	}

	/**
	 * Continue dragging the currently dragged state.
	 * @param {Number} cursorPos
	 */
	dragStateContinue(cursorPos) {
		if (!this.isDraggingState()) {
			return;
		}
		// A state is being dragged
		// Calculate the difference between the cursor's current and previous position, and move the state along that vector
		this.setState((prevState, prevProps) => {
			const diff = cursorPos.minus(prevState.cursorPos);
			const oldPos = prevState.positions.get(prevState.draggingState);
			const newPos = oldPos.plus(diff);
			return {
				positions: prevState.positions.set(prevState.draggingState, newPos),
				cursorPos: cursorPos,
			};
		});
	}

	/**
	 * Stop dragging a state.
	 */
	dragStateStop() {
		this.setState({draggingState: 0});
	}

	/**
	 * Cancel drawing the current transition.
	 */
	drawTransitionCancel() {
		console.log("drawTransitionCancel");
		this.setState({drawingTransitionOrigin: 0, drawingTransitionTarget: 0});
	}

	/**
	 * Complete drawing a transition, creating the new transition if possible.
	 */
	drawTransitionComplete() {
		if (!this.isDrawingTransition()) {
			return;
		}
		console.log("drawTransitionComplete");
		if (this.state.drawingTransitionOrigin && this.state.drawingTransitionTarget) {
			this.props.promptAddTransition(this.state.drawingTransitionOrigin, this.state.drawingTransitionTarget);
		}
		this.drawTransitionCancel();
	}

	/**
	 * Continue drawing a transition.
	 * @param {Number} cursorPos The current cursor position.
	 */
	drawTransitionContinue(cursorPos) {
		if (!this.isDrawingTransition()) {
			return;
		}
		this.setState({cursorPos: cursorPos});
	}

	/**
	 * Start drawing (or moving) a transition.
	 * @param {Number} origin The origin state.
	 * @param {Vector} cursorPos The initial cursor position.
	 */
	drawTransitionStart(origin, cursorPos) {
		console.log("drawTransitionStart");
		this.setState({
			cursorPos: cursorPos,
			drawingTransitionOrigin: origin,
			drawingTransitionTarget: 0,
		});
	}

	/**
	 * Set a target for the transition being drawn.
	 * @param {Number} target The new target (0 for no target).
	 */
	drawTransitionSetTarget(target) {
		if (!this.isDrawingTransition()) {
			return;
		}
		this.setState({drawingTransitionTarget: target});
	}

	/**
	 * Convert DOM coordinates to SVG coordinates.
	 * @param {Number|Vector} x
	 * @param {Number} [y]
	 */
	getSVGPoint(x, y) {
		if (x instanceof Vector) {
			y = x.y;
			x = x.x;
		}
		let point = this.refs.svg.createSVGPoint();
		point.x = x;
		point.y = y;
		point = point.matrixTransform(this.refs.svg.getScreenCTM().inverse());
		return new Vector(point.x, point.y);
	}

	/**
	 * Check whether a state is being dragged.
	 * @param {Boolean}
	 */
	isDraggingState() {
		return !!this.state.draggingState;
	}

	/**
	 * Check whether a transition is being drawn.
	 * @param {Boolean}
	 */
	isDrawingTransition() {
		return this.state.drawingTransitionOrigin || this.state.drawingTransitionTarget;
	}

	/**
	 * Event handler for when the mouse is pressed on a state.
	 * @param {Event} e
	 * @param {Number} state
	 */
	onMouseDownState(e, state) {
		const cursorPos = this.getSVGPoint(e.clientX, e.clientY);
		// If left-click, this is a state drag; if right-click, it's a transition drag
		if (e.button === 0) {
			this.dragStateStart(state, cursorPos);
		} else if (e.button === 2) {
			this.drawTransitionStart(state, cursorPos);
		}
	}

	/**
	 * Event handler for when the mouse enters a state.
	 * @param {Event} e
	 * @param {Number} state
	 */
	onMouseEnterState(e, state) {
		if (this.isDrawingTransition()) {
			this.drawTransitionSetTarget(state);
		}
	}

	/**
	 * Event handler for when the mouse leaves the editor.
	 */
	onMouseLeave() {
		this.dragStateStop();
		this.drawTransitionCancel();
	}

	/**
	 * Event handler for when the mouse leaves a state.
	 */
	onMouseLeaveState() {
		this.drawTransitionSetTarget(0);
	}

	/**
	 * Event handler for when the mouse moves on the editor.
	 * @param {Event} e
	 */
	onMouseMove(e) {
		const cursorPos = this.getSVGPoint(e.clientX, e.clientY);
		this.dragStateContinue(cursorPos);
		this.drawTransitionContinue(cursorPos);
	}

	/**
	 * Event handler for when the mouse is released on the editor.
	 * @param {Event} e
	 */
	onMouseUp(e) {
		if (e.button === 2) {
			// Stop the context menu from appearing, if a right-click
			e.preventDefault();
		}
		this.dragStateStop();
		this.drawTransitionComplete();
	}

	/**
	 * Set the positions of the states so that they are arranged in a circle around the center of the editor.
	 */
	resetPositions() {
		this.setState((state, props) => {
			const positions = Map().asMutable(); // Stores the positions of each state
			const numStates = props.nfa.numStates;

			let angle = Math.PI; // The angle at which the next state should be placed
			const offset = Math.min(this.width, this.height) * 0.3; // The distance each state should start from the centre
			const direction = -1; // -1 for clockwise, 1 for anticlockwise

			for (const state of props.nfa.states) {
				const x = Math.round(this.width * 0.5 + Math.cos(angle) * offset);
				const y = Math.round(this.height * 0.5 - Math.sin(angle) * offset);
				positions.set(state, new Vector(x, y));
				angle += Math.PI * 2 / numStates * direction;
			}
			return {positions: positions.asImmutable()};
		});
	}

	/**
	 * Get the x-coordinate of a state.
	 * @param {Number} state
	 * @returns {Number}
	 */
	x(state) {
		return this.pos(state).x;
	}

	/**
	 * Get the y-coordinate of a state.
	 * @param {Number} state
	 * @returns {Number}
	 */
	y(state) {
		return this.pos(state).y;
	}

	/**
	 * Get the position of a state.
	 * @param {Number} state
	 * @returns {Vector}
	 */
	pos(state) {
		if (!this.state.positions.has(state)) {
			return this.DEFAULT_POS;
		}
		return this.state.positions.get(state);
	}

	/**
	 * Return an array of SVG groups for all transitions from a state.
	 * @returns {React.Element[]}
	 */
	renderTransitions() {
		let nfa = this.props.nfa;
		const output = [];
		const angles = Map().asMutable(); // List of angles around the state's circle at which each transition arrow leaves

		for (const state of nfa.states) {
			angles.set(state, []);
		};

		// If a transition is being drawn or moved, this overrides the NFA's actual transitions as far as rendering is concerned
		if (this.isDrawingTransition()) {
			const origin = this.state.drawingTransitionOrigin;
			const target = this.state.drawingTransitionTarget;
			if (!nfa.hasTransition(origin, target)) {
				nfa = nfa.setTransition(origin, target, this.state.drawingTransitionSymbols || "?");
			}
		}

		// Render interstate transitions
		for (const origin of nfa.states) {
			const originPos = this.pos(origin);
			for (const [target,] of nfa.transitionsFrom(origin)) {
				if (origin === target) {
					// Will need to make special case for self-connections
					continue;
				}

				const targetPos = this.pos(target);

				// Don't bother rendering if the states are overlapping
				const dist = originPos.distanceTo(targetPos);
				if (dist < this.STATE_RADIUS) {
					continue;
				}

				let control;

				// If there is a two-way connection, draw curved lines
				if (nfa.hasTransition(target, origin)) {
					control = perpendicularOffset(originPos, targetPos, 30);
				} else {
					control = originPos.midpoint(targetPos);
				}

				const t = 1 - this.STATE_RADIUS / dist;

				// Push the angle around the state circle from which the transition arrow protrudes
				if (nfa.hasTransition(origin, origin)) {
					const originIntersectPos = quadraticCurveAt(originPos, control, targetPos, 1 - t);
					angles.get(origin).push(originPos.angleTo(originIntersectPos));
				}

				// And the angle at which it enters the target
				if (nfa.hasTransition(target, target)) {
					const targetIntersectPos = quadraticCurveAt(originPos, control, targetPos, t);
					angles.get(target).push(targetPos.angleTo(targetIntersectPos));
				}

				output.push(<LabelledArrow
					key={[origin, target]}
					className="transition"
					start={originPos}
					control={control}
					end={targetPos}
					label={nfa.symbolsString(origin, target)}
					arrowHeadT={t}
					onClickShaft={() => this.props.confirmRemoveTransition(origin, target)}
					onClickLabel={() => this.props.promptUpdateTransitionSymbols(origin, target)}
				/>);
			}
		}

		// Render self-transitions
		for (const state of nfa.states) {
			if (nfa.hasTransition(state, state)) {
				const pos = this.pos(state);
				let angs = angles.get(state);

				let angle;

				if (angs.length === 0) {
					angle = - Math.PI / 2;
				} else if (angs.length === 1) {
					// If there is just one arrow, put the self-arrow on the opposite side
					angle = angs[0] + Math.PI;
				} else {
					// Otherwise, we want to put the transition wherever there is the largest gap between two other arrows.
					angs.sort((a, b) => a - b);
					// The loop will get every angle difference except from the last to the first
					let max = Math.PI * 2 + angs[0] - angs[angs.length - 1];
					angle = (Math.PI * 2 + angs[0] + angs[angs.length - 1]) / 2;
					for (let i = 0; i < angs.length - 1; i++) {
						const diff = angs[i + 1] - angs[i];
						if (diff > max) {
							max = diff;
							angle = (angs[i + 1] + angs[i]) / 2;
						}
					}
				}

				const r = this.STATE_RADIUS * 0.4; // The radius of the arc to draw
				const theta = Math.PI / 6; // The desired angle between the two intersection points of the arc with the state circle
				const aStart = angle - theta / 2;
				const aEnd = angle + theta / 2;
				const start = pos.plus(new Vector(this.STATE_RADIUS, aStart, true));
				const end = pos.plus(new Vector(this.STATE_RADIUS, aEnd, true));

				output.push(<LabelledArrow
					key={[state, state]}
					className="transition"
					start={start}
					end={end}
					radius={r}
					label={nfa.symbolsString(state, state)}
					onClickShaft={() => this.props.confirmRemoveTransition(state, state)}
					onClickLabel={() => this.props.promptUpdateTransitionSymbols(state, state)}
				/>);
			}
		}

		// Render transition currently being drawn
		if (this.state.drawingTransitionOrigin && !this.state.drawingTransitionTarget) {
			output.push(<LabelledArrow
				key="DRAWING"
				className="transition editing"
				start={this.pos(this.state.drawingTransitionOrigin)}
				end={this.state.cursorPos}
			/>);
		}

		return output;
	}

	render() {
		const states = [];
		const nfa = this.props.nfa;
		for (const state of nfa.states) {
			states.push(<g
				key={state}
				transform={"translate(" + this.x(state) + ", " + this.y(state) + ")"}
				onMouseDown={(e) => this.onMouseDownState(e, state)}
				onMouseEnter={(e) => this.onMouseEnterState(e, state)}
				onMouseLeave={(e) => this.onMouseLeaveState(e, state)}
				className={'state ' + (!nfa.reachable(state) ? 'state-unreachable ' : '') + (nfa.accept(state) ? 'state-accept ' : '') + (!nfa.generating(state) ? 'state-nongenerating ' : '')}
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
					y={-0.8 * this.STATE_RADIUS}
					width={this.STATE_RADIUS}
					height={this.STATE_RADIUS}
				>
					<i
						className={"fa fa-flag-checkered" + (!nfa.isStart(state) ? " btn-edit-state" : "")}
						title={!nfa.isStart(state) ? "Set as start" : null}
						onClick={() => {if (!nfa.isStart(state)) this.props.setStart(state); }}
					></i>
				</foreignObject>
				<foreignObject
					x={-0.5 * this.STATE_RADIUS}
					y={0.4 * this.STATE_RADIUS}
					width={this.STATE_RADIUS}
					height={this.STATE_RADIUS}
				>
					<i
						className="fa fa-pencil btn-edit-state"
						title="Edit name"
						onClick={() => this.props.promptEditState(state)}
					></i>
					<i
						className="fa fa-remove btn-edit-state"
						title="Delete"
						onClick={() => this.props.confirmRemoveState(state)}
					></i>
					<i
						className="fa fa-check btn-edit-state"
						title={nfa.accept(state) ? "Remove accept state" : "Make accept state"}
						onClick={() => this.props.toggleAccept(state)}
					></i>
				</foreignObject>
				<text
					fontFamily="Verdana"
					x={0}
					y={0}
					textAnchor="middle"
				>{nfa.name(state)}</text>
			</g>);
		}

		return (
			<div className="VisualEditor">
				<svg
					ref="svg"
					width={this.width}
					height={this.height}
					onMouseMove={(e) => {this.onMouseMove(e)}}
					onMouseLeave={(e) => {this.onMouseLeave(e)}}
					onMouseUp={(e) => {this.onMouseUp(e)}}
				>
					{this.renderTransitions()}
					{states}
				</svg>
			</div>
		);
	}
}

export default VisualEditor;
