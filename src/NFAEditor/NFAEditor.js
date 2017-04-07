import React, { Component } from 'react';
import ListEditor from './ListEditor/ListEditor.js';
import VisualEditor from './VisualEditor/VisualEditor.js';
import './NFAEditor.css';

class NFAEditor extends Component {
	constructor(props) {
		super(props);
		this.state = {
			editor: 'visual',
			nfa: this.props.nfa
		}

		// Bind all methods to this
		for (const methodName of Object.getOwnPropertyNames(this.constructor.prototype)) {
			if (this[methodName] instanceof Function) {
				this[methodName] = this[methodName].bind(this);
			}
		}
	}

	componentDidUpdate() {
		console.log("NFAEditor updated.");
	}

	shouldComponentUpdate(nextProps, nextState) {
		if (this.state.editor !== nextState.editor) {
			return true;
		}
		if (this.state.nfa !== nextState.nfa) {
			return true;
		}
		return false;
	}

	/**
	 * Update the NFAEditor's state with a new NFA, based on the result of calling one of the NFA's methods.
	 * @param {String} methodName The name of the NFA method to call.
	 * @param {*} args The args to pass to the NFA method call.
	 */
	handle(methodName, args) {
		this.setState((prevState, props) => {
			if (!(prevState.nfa[methodName] instanceof Function)) {
				console.log(methodName + " is not a valid NFA method!");
				throw new Error(methodName + " is not a valid NFA method!");
			}
			try {
				return {
					nfa: prevState.nfa[methodName](...([...arguments].slice(1)))
				};
			} catch (e) {
				window.alert(e.message);
				return;
			}
		});
	}

	addState(name) {
		this.handle('addState', name);
	}

	confirmRemoveState(state) {
		if (!window.confirm("Are you sure you want to delete this state?")) {
			return;
		}
		this.handle('removeState', ...arguments);
	}

	confirmRemoveTransition(origin, target) {
		if (!window.confirm("Are you sure you want to delete this transition?")) {
			return;
		}
		this.handle('removeTransition', ...arguments);
	}

	promptEditState(state) {
		const newName = window.prompt("Enter a state name.", this.props.nfa.name(state));
		if (newName) {
			this.updateStateName(state, newName);
		}
	}

	promptUpdateTransitionSymbols(origin, target) {
		const symbols = window.prompt("Enter a new symbol or symbols.", this.state.nfa.symbols(origin, target));
		if (symbols === null) {
			return;
		}
		this.handle('setTransitionSymbols', origin, target, symbols);
	}

	switchEditor(editor) {
		console.log(editor);
		this.setState({editor: editor});
	}

	toggleAccept(state) {
		this.handle('toggleAccept', ...arguments);
	}

	updateStart(state) {
		this.handle('setStart', ...arguments);
	}

	updateStateName(state, name) {
		this.handle('setName', ...arguments);
	}

	updateTransitionTarget(origin, oldTarget, newTarget) {
		if (this.state.nfa.hasTransition(origin, newTarget)) {
			if (!window.confirm("There is already a transition to that state, so this will merge the two transitions. Do you wish to continue?")) {
				return;
			}
		}
		this.handle('setTransitionTarget', ...arguments)
	}

	render() {
		const nfa = this.state.nfa;
		return (<div className="row">
			<div className="col-md-4">
				<select className="form-control" value={this.state.editor} onChange={(e) => this.switchEditor(e.target.value)}>
					<option value="list">List Editor</option>
					<option value="visual">Visual Editor</option>
				</select>
				<br/>
				<button className="btn btn-default" onClick={() => this.addState()}>Add State</button>
				<br/><br/>
				<button
					className="btn btn-default"
					disabled={nfa.isDFA()}
				>{nfa.isDFA() ? "Already a DFA" : "Convert to DFA"}</button>
			</div>
			<div className="col-md-8">
				<div style={{display: (this.state.editor === 'list') ? 'block' : 'none'}}>
					<ListEditor
						nfa={this.state.nfa}
						promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
						toggleAccept={this.toggleAccept}
						updateStart={this.updateStart}
						updateStateName={this.updateStateName}
						updateTransitionTarget={this.updateTransitionTarget}
					/>
				</div>
				<div style={{display: (this.state.editor === 'visual') ? 'block' : 'none'}}>
					<VisualEditor
						nfa={this.state.nfa}
						confirmRemoveState={this.confirmRemoveState}
						confirmRemoveTransition={this.confirmRemoveTransition}
						promptEditState={this.promptEditState}
						promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
						toggleAccept={this.toggleAccept}
					/>
				</div>
			</div>
		</div>);
	}
}

export default NFAEditor;
