import React, { Component } from 'react';
import {List} from 'immutable';
import TransitionList from './TransitionList.js';
import './ListEditor.css';

class ListEditor extends Component {
	constructor(props) {
		super(props);

		this.handleMoveStateDown = this.handleMoveStateDown.bind(this);
		this.handleMoveStateUp = this.handleMoveStateUp.bind(this);

		this.state = {
			order: List(this.props.nfa.states)
		}
		Object.freeze(this.state.order);
	}

	componentWillReceiveProps(nextProps) {
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

	handleMoveStateDown(id) {
		this.moveState(id, 1);
	}

	handleMoveStateUp(id) {
		this.moveState(id, -1);
	}

	moveState(id, inc) {
		id = Number(id);
		this.setState((state, props) => {
			// Perform the swap
			let pos1 = state.order.indexOf(id);
			let pos2 = pos1 + inc;
			if (pos1 === -1 || pos2 < 0 || pos2 >= state.order.length) {
				return;
			}
			const newOrder = state.order.withMutations(order => {
				order.set(pos1, order.get(pos2)).set(pos2, id);
			});
			return {
				order: newOrder
			}
		});
	}

	render() {
		const nfa = this.props.nfa;
		const rows = this.state.order.map((state) => {
			return <tr key={state} className={'state ' + (!nfa.reachable(state) ? 'state-unreachable ' : '') + (nfa.accept(state) ? 'state-accept ' : '') + (!nfa.generating(state) ? 'state-nongenerating ' : '')}>
				<td>
					<button onClick={() => this.handleMoveStateUp(state)}><i className="fa fa-chevron-up"></i></button>
					<button onClick={() => this.handleMoveStateDown(state)}><i className="fa fa-chevron-down"></i></button>
				</td>
				<td><input name="start" type="radio" onChange={() => this.props.setStart(state)} checked={nfa.isStart(state)} /></td>
				<td>{state}</td>
				<td><input type="text" className="form-control" value={nfa.name(state)} onChange={(e) => this.props.setName(state, e.target.value)} /></td>
				<td>
					<TransitionList nfa={nfa} state={state}
					handleUpdateTransitionTarget={this.props.updateTransitionTarget}
					promptUpdateTransitionSymbols={this.props.promptUpdateTransitionSymbols} />
				</td>
				<td>
					<input type="checkbox" onChange={(e) => this.props.updateAccept(state, e.target.checked)} checked={nfa.accept(state)} />
				</td>
			</tr>;
		});
		return (
			<div>
				<table className="form-inline table">
					<colgroup>
						<col span="1" style={{width: "5%"}} />
						<col span="1" style={{width: "5%"}} />
						<col span="1" style={{width: "5%"}} />
						<col span="1" style={{width: "30%"}} />
						<col span="1" style={{width: "50%"}} />
						<col span="1" style={{width: "5%"}} />
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
