import {List} from 'immutable';
import * as React from 'react';
import NFA, {State} from '../../Core/NFA';
import './ListEditor.css';
import TransitionList from './TransitionList';

interface IProps {
	nfa: NFA,
	promptUpdateTransitionSymbols: (state: State, target: State) => any,
	setStart: (state: State) => any,
	setName: (state: State, name: string) => any,
	toggleAccept: (state: State) => any,
	updateTransitionTarget: (origin: State, oldTarget: State, newTarget: State) => any,
};
interface IState {
	order: List<State>,
};

class ListEditor extends React.PureComponent<IProps, IState> {
	constructor(props: IProps) {
		super(props);

		this.handleMoveStateDown = this.handleMoveStateDown.bind(this);
		this.handleMoveStateUp = this.handleMoveStateUp.bind(this);

		this.state = {
			order: List(this.props.nfa.states),
		};
		Object.freeze(this.state.order);
	}

	componentWillReceiveProps(nextProps: IProps) {
		if (this.props.nfa.states === nextProps.nfa.states) {
			return;
		}
		let newOrder = this.state.order.asMutable();
		// Remove any states that no longer exist
		newOrder = newOrder.filter((state) => nextProps.nfa.state(state));

		// Add any new states
		for (const state of nextProps.nfa.states) {
			if (!this.state.order.includes(state)) {
				newOrder.push(state);
			}
		}

		this.setState({order: newOrder});
	}

	handleMoveStateDown(state: State) {
		this.moveState(state, 1);
	}

	handleMoveStateUp(state: State) {
		this.moveState(state, -1);
	}

	moveState(state: State, inc: number) {
		this.setState((prevState, prevProps) => {
			// Perform the swap
			const pos1 = prevState.order.indexOf(state);
			const pos2 = pos1 + inc;
			if (pos1 === -1 || pos2 < 0 || pos2 >= prevState.order.size) {
				return;
			}
			const newOrder = prevState.order.withMutations(order => {
				order.set(pos1, order.get(pos2) as State).set(pos2, state);
			});
			return {
				order: newOrder
			};
		});
	}

	render() {
		const nfa = this.props.nfa;
		const rows = this.state.order.map((state) => {
			return (
				<tr
					key={state}
					className={
						'state '
						+ (!nfa.reachable(state) ? 'state-unreachable ' : '')
						+ (nfa.isAccept(state) ? 'state-accept ' : '')
						+ (!nfa.generating(state) ? 'state-nongenerating ' : '')
					}
				>
					<td>
						<button onClick={() => this.handleMoveStateUp(state)}><i className="fa fa-chevron-up" /></button>
						<button onClick={() => this.handleMoveStateDown(state)}><i className="fa fa-chevron-down" /></button>
					</td>
					<td>
						<input name="start" type="radio" onChange={() => this.props.setStart(state)} checked={nfa.isStart(state)} />
					</td>
					<td>{state}</td>
					<td>
						<input
							type="text"
							className="form-control"
							value={nfa.name(state)}
							onChange={(e) => this.props.setName(state, e.target.value)}
						/>
					</td>
					<td>
						<TransitionList
							nfa={nfa}
							state={state}
							updateTransitionTarget={this.props.updateTransitionTarget}
							promptUpdateTransitionSymbols={this.props.promptUpdateTransitionSymbols}
						/>
					</td>
					<td>
						<input type="checkbox" onChange={(e) => this.props.toggleAccept(state)} checked={nfa.isAccept(state)} />
					</td>
				</tr>
			);
		});
		return (
			<div>
				<table className="form-inline table">
					<colgroup>
						<col span={1} style={{width: '5%'}} />
						<col span={1} style={{width: '5%'}} />
						<col span={1} style={{width: '5%'}} />
						<col span={1} style={{width: '30%'}} />
						<col span={1} style={{width: '50%'}} />
						<col span={1} style={{width: '5%'}} />
					</colgroup>
					<thead><tr>
						<th>Move</th>
						<th>Start</th>
						<th>ID</th>
						<th>Name</th>
						<th>Symbol > Target</th>
						<th>Accept</th>
					</tr></thead>
					<tbody>{rows}</tbody>
				</table>
				<span className="state-unreachable">Unreachable</span>,&nbsp;
				<span className="state-nongenerating">Non-generating</span>,&nbsp;
				<span className="state-accept">Accept</span>
			</div>
		);
	}
}

export default ListEditor;
