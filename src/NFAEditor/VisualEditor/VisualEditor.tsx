import * as React from 'react';
import RunnableNFA, {State} from '../../Core/RunnableNFA';
import {Map} from 'immutable';
import {Vector, perpendicularOffset, quadraticCurveAt} from '../../Util/math';
import VisualState from './VisualState/VisualState';
import LabelledArrow from './LabelledArrow';
import './VisualEditor.css';

type CProps = {
	nfa: RunnableNFA,
	confirmRemoveState: (state: State) => any,
	confirmRemoveTransition: (origin: State, target: State) => any,
	promptAddTransition: (origin: State, target: State) => any,
	promptEditState: (state: State) => any,
	promptUpdateTransitionSymbols: (origin: State, target: State) => any,
	setStart: (state: State) => any,
	toggleAccept: (state: State) => any,
};
type CState = {
	positions: Map<State, Vector>,
	cursorPos: Vector,
	draggingState: State,
	drawingTransitionOrigin: State,
	drawingTransitionTarget: State,
	drawingTransitionSymbols?: string,
};

class VisualEditor extends React.PureComponent<CProps, CState> {
	width: number = 820;
	height: number = 650;
	DEFAULT_POS: Vector;
	STATE_RADIUS: number = 50;
	NAME_SIZE: number = 14;
	svg: SVGSVGElement;

	constructor(props: CProps) {
		super(props);

		this.DEFAULT_POS = new Vector(this.width / 2, this.height / 2);

		this.state = {
			positions: Map() as Map<State, Vector>,
			cursorPos: new Vector(-1, -1),
			draggingState: 0,
			drawingTransitionOrigin: 0,
			drawingTransitionTarget: 0,
			drawingTransitionSymbols: "",
		};
		Object.freeze(this.state);
	}

	componentDidMount() {
		this.resetPositions();
	}

	componentDidUpdate() {
		console.log("VisualEditor updated.");
	}

	componentWillReceiveProps(nextProps: CProps) {
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
					};
				});
			}
		}
	}

	/**
	 * Start dragging a state.
	 * @param cursorPos  Initial cursor position.
	 */
	dragStateStart(state: State, cursorPos: Vector) {
		this.setState({
			cursorPos: cursorPos,
			draggingState: state,
		});
	}

	/**
	 * Continue dragging the currently dragged state.
	 */
	dragStateContinue(cursorPos: Vector) {
		if (!this.isDraggingState()) {
			return;
		}
		// A state is being dragged
		// Calculate the difference between the cursor's current and previous position, and move the state along that vector
		this.setState((prevState, prevProps) => {
			const diff = cursorPos.minus(prevState.cursorPos as Vector);
			const oldPos = prevState.positions.get(prevState.draggingState);
			if (!oldPos) {
				return;
			}
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
		this.setState({drawingTransitionOrigin: 0, drawingTransitionTarget: 0});
	}

	/**
	 * Complete drawing a transition, creating the new transition if possible.
	 */
	drawTransitionComplete() {
		if (!this.isDrawingTransition()) {
			return;
		}
		if (this.state.drawingTransitionOrigin && this.state.drawingTransitionTarget) {
			this.props.promptAddTransition(this.state.drawingTransitionOrigin, this.state.drawingTransitionTarget);
		}
		this.drawTransitionCancel();
	}

	/**
	 * Continue drawing a transition.
	 * @param cursorPos  The current cursor position.
	 */
	drawTransitionContinue(cursorPos: Vector) {
		if (!this.isDrawingTransition()) {
			return;
		}
		this.setState({cursorPos: cursorPos});
	}

	/**
	 * Start drawing (or moving) a transition.
	 * @param origin  The origin state.
	 * @param cursorPos  The initial cursor position.
	 */
	drawTransitionStart(origin: State, cursorPos: Vector) {
		this.setState({
			cursorPos: cursorPos,
			drawingTransitionOrigin: origin,
			drawingTransitionTarget: 0,
		});
	}

	/**
	 * Set a target for the transition being drawn.
	 * @param target  The new target (0 for no target).
	 */
	drawTransitionSetTarget(target: State) {
		if (!this.isDrawingTransition()) {
			return;
		}
		this.setState({drawingTransitionTarget: target});
	}

	/**
	 * Convert DOM coordinates to SVG coordinates.
	 */
	getSVGPoint(x: number | Vector, y?: number) {
		if (x instanceof Vector) {
			y = x.y;
			x = x.x;
		}
		let point = this.svg.createSVGPoint();
		point.x = x;
		point.y = y as number;
		point = point.matrixTransform(this.svg.getScreenCTM().inverse());
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
	 */
	onMouseDownState(e: React.MouseEvent<any>, state: State) {
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
	 */
	onMouseEnterState(e: React.MouseEvent<any>, state: State) {
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
	 */
	onMouseMove(e: React.MouseEvent<any>) {
		const cursorPos = this.getSVGPoint(e.clientX, e.clientY);
		this.dragStateContinue(cursorPos);
		this.drawTransitionContinue(cursorPos);
	}

	/**
	 * Event handler for when the mouse is released on the editor.
	 */
	onMouseUp(e: React.MouseEvent<any>) {
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
		this.setState((prevState: CState, prevProps: CProps) => {
			const positions = Map().asMutable(); // Stores the positions of each state
			const numStates = prevProps.nfa.numStates;

			let angle = Math.PI; // The angle at which the next state should be placed
			const offset = Math.min(this.width, this.height) * 0.3; // The distance each state should start from the centre
			const direction = -1; // -1 for clockwise, 1 for anticlockwise

			for (const state of prevProps.nfa.states) {
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
	 */
	x(state: State): number {
		return this.pos(state).x;
	}

	/**
	 * Get the y-coordinate of a state.
	 */
	y(state: State): number {
		return this.pos(state).y;
	}

	/**
	 * Get the position of a state, default (-1, -1).
	 */
	pos(state: State): Vector {
		if (!this.state.positions.has(state)) {
			return this.DEFAULT_POS;
		}
		return this.state.positions.get(state) || new Vector(-1, -1);
	}

	/**
	 * Return an array of all transitions from a state.
	 */
	renderTransitions() {
		let nfa = this.props.nfa;
		const output: JSX.Element[] = [];

		// List of angles around the state's circle at which each transition arrow leaves
		const angles = Map().asMutable() as Map<State, number[]>;

		for (const state of nfa.states) {
			angles.set(state, [] as number[]);
		}

		// If a transition is being drawn or moved, this overrides the NFA's actual transitions
		if (this.isDrawingTransition()) {
			const origin = this.state.drawingTransitionOrigin;
			const target = this.state.drawingTransitionTarget;
			if (!nfa.hasTransition(origin, target)) {
				nfa = nfa.setTransition(origin, target, this.state.drawingTransitionSymbols || "?");
			}
		}

		const getClassName = (origin: State, target: State) => {
			let className = "transition";
			if (nfa.hasFollowed(origin, target)) {
				className += " followed";
			}
			if (nfa.justFollowed(origin, target)) {
				className += " just-followed";
			}
			return className;
		};

		// Render interstate transitions
		for (const origin of nfa.states) {
			const originPos = this.pos(origin);
			for (const [target, ] of nfa.transitionsFrom(origin)) {
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
					(angles.get(origin) as number[]).push(originPos.angleTo(originIntersectPos));
				}

				// And the angle at which it enters the target
				if (nfa.hasTransition(target, target)) {
					const targetIntersectPos = quadraticCurveAt(originPos, control, targetPos, t);
					(angles.get(target) as number[]).push(targetPos.angleTo(targetIntersectPos));
				}

				output.push(
					<LabelledArrow
						key={origin + "-" + target}
						className={getClassName(origin, target)}
						start={originPos}
						control={control}
						end={targetPos}
						label={nfa.symbols(origin, target).toString(", ")}
						arrowHeadT={t}
						onClickShaft={() => this.props.confirmRemoveTransition(origin, target)}
						onClickLabel={() => this.props.promptUpdateTransitionSymbols(origin, target)}
					/>
				);
			}
		}

		// Render self-transitions
		for (const state of nfa.states) {
			if (nfa.hasTransition(state, state)) {
				const pos = this.pos(state);
				let angs = angles.get(state) as number[];

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

				output.push(
					<LabelledArrow
						key={state + "-" + state}
						className={getClassName(state, state)}
						start={start}
						end={end}
						radius={r}
						label={nfa.symbols(state, state).toString(", ")}
						onClickShaft={() => this.props.confirmRemoveTransition(state, state)}
						onClickLabel={() => this.props.promptUpdateTransitionSymbols(state, state)}
					/>
				);
			}
		}

		// Render transition currently being drawn
		if (this.state.drawingTransitionOrigin && !this.state.drawingTransitionTarget) {
			output.push((
				<LabelledArrow
					key="DRAWING"
					className="transition editing"
					start={this.pos(this.state.drawingTransitionOrigin)}
					end={this.state.cursorPos}
				/>
			));
		}

		return output;
	}

	render() {
		const nfa = this.props.nfa;
		return (
			<div className="VisualEditor">
				<svg
					ref={(svg) => this.svg = svg}
					width="100%"
					height="100%"
					onMouseMove={(e) => this.onMouseMove(e)}
					onMouseLeave={(e) => this.onMouseLeave()}
					onMouseUp={(e) => this.onMouseUp(e)}
				>
					{this.renderTransitions()}
					{nfa.states.map((state) => (
						<g
							key={state}
							transform={"translate(" + this.x(state) + ", " + this.y(state) + ")"}
						>
							<VisualState
								nfa={nfa}
								state={state}
								radius={this.STATE_RADIUS}
								onMouseDown={(e) => this.onMouseDownState(e, state)}
								onMouseEnter={(e) => this.onMouseEnterState(e, state)}
								onMouseLeave={() => this.onMouseLeaveState()}
								promptEditName={() => this.props.promptEditState(state)}
								remove={() => this.props.confirmRemoveState(state)}
								setStart={() =>  this.props.setStart(state)}
								toggleAccept={() =>  this.props.toggleAccept(state)}
							/>
						</g>
					))}
				</svg>
			</div>
		);
	}
}

export default VisualEditor;
