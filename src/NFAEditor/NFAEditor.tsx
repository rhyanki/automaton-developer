import * as React from 'react';
import NFA, {State} from '../Core/NFA';
import ListEditor from './ListEditor/ListEditor';
import VisualEditor from './VisualEditor/VisualEditor';
import './NFAEditor.css';

const _visualEditorInstructions = (
	<div>
		<p>To create a new transition, right-click on a state and drag the mouse to another state.</p>
	</div>
);

type CProps = {
	nfa: NFA
};
type CState = {
	editor: string,
	nfa: NFA
};

export default class NFAEditor extends React.PureComponent<CProps, CState> {
	constructor(props: CProps) {
		super(props);
		this.state = {
			editor: 'visual',
			nfa: this.props.nfa
		};

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

	/**
	 * Update the NFAEditor's state with a new NFA, based on the result of calling one of the NFA's methods.
	 * @param {String} methodName The name of the NFA method to call.
	 * @param {*} args The args to pass to the NFA method call.
	 */
	handle(methodName: string, ...args: any[]): void {
		this.setState((prevState, props) => {
			if (!(prevState.nfa[methodName] instanceof Function)) {
				console.log(methodName + " is not a valid NFA method!");
				throw new Error(methodName + " is not a valid NFA method!");
			}
			try {
				return {
					nfa: prevState.nfa[methodName](...args)
				};
			} catch (e) {
				window.alert(e.message);
				return;
			}
		});
	}

	addState(name?: string) {
		this.handle('addState', name);
	}

	confirmRemoveState(state: State) {
		if (!window.confirm("Are you sure you want to delete this state?")) {
			return;
		}
		this.handle('removeState', ...arguments);
	}

	confirmRemoveTransition(origin: State, target: State) {
		if (!window.confirm("Are you sure you want to delete this transition?")) {
			return;
		}
		this.handle('removeTransition', ...arguments);
	}

	promptAddTransition(origin: State, target: State) {
		this.promptUpdateTransitionSymbols(origin, target);
	}

	promptEditState(state: State) {
		const newName = window.prompt("Enter a state name.", this.props.nfa.name(state));
		if (newName) {
			this.setName(state, newName);
		}
	}

	promptUpdateTransitionSymbols(origin: State, target: State) {
		const symbols = window.prompt("Enter a new symbol or symbols.", this.state.nfa.symbols(origin, target).toString());
		if (symbols === null) {
			return;
		}
		this.handle('setTransition', origin, target, symbols);
	}

	setStart(state: State) {
		this.handle('setStart', ...arguments);
	}

	setName(state: State, name: string) {
		this.handle('setName', ...arguments);
	}

	switchEditor(editor: string) {
		console.log(editor);
		this.setState({editor: editor});
	}

	toggleAccept(state: State) {
		this.handle('toggleAccept', ...arguments);
	}

	updateTransitionTarget(origin: State, oldTarget: State, newTarget: State) {
		if (this.state.nfa.hasTransition(origin, newTarget)) {
			if (!window.confirm("There is already a transition to that state, so this will merge the two transitions.\
				Do you wish to continue?")) {
				return;
			}
		}
		this.handle('setTransitionTarget', ...arguments);
	}

	render() {
		const nfa = this.state.nfa;
		return ((
			<div className="row">
				<div className="col-md-4">
					<select className="form-control" value={this.state.editor} onChange={(e) => this.switchEditor(e.target.value)}>
						<option value="list">List Editor</option>
						<option value="visual">Visual Editor</option>
					</select>
					<br/>
					{this.state.editor === 'visual' ? _visualEditorInstructions : null}
					<button className="btn btn-default" onClick={() => this.addState()}>Add State</button>
					<br/>
					<br/>
					<button className="btn btn-default" disabled={nfa.isDFA}>
						{nfa.isDFA ? "Already a DFA" : "Convert to DFA"}
					</button>
					<br/>
					<br/>
					<button className="btn btn-default" onClick={() => console.log(this.state.nfa)}>Log NFA to console</button>
				</div>
				<div className="col-md-8">
					<div style={{display: (this.state.editor === 'list') ? 'block' : 'none'}}>
						<ListEditor
							nfa={this.state.nfa}
							promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
							setStart={this.setStart}
							setName={this.setName}
							toggleAccept={this.toggleAccept}
							updateTransitionTarget={this.updateTransitionTarget}
						/>
					</div>
					<div style={{display: (this.state.editor === 'visual') ? 'block' : 'none'}}>
						<VisualEditor
							nfa={this.state.nfa}
							confirmRemoveState={this.confirmRemoveState}
							confirmRemoveTransition={this.confirmRemoveTransition}
							promptAddTransition={this.promptAddTransition}
							promptEditState={this.promptEditState}
							promptUpdateTransitionSymbols={this.promptUpdateTransitionSymbols}
							setStart={this.setStart}
							toggleAccept={this.toggleAccept}
						/>
					</div>
				</div>
			</div>
		));
	}
}