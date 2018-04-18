import {List} from 'immutable';
import * as React from 'react';

import RunnableNFA from '../../Core/RunnableNFA';

import './TestInputEditor.css';

interface IProps {
	nfa: RunnableNFA,
	runOnInput: (input: string) => any,
};
interface IState {
	inputs: List<string>,
};

export default class TestInputEditor extends React.PureComponent<IProps, IState> {
	constructor(props: IProps) {
		super(props);

		this.state = {
			inputs: List([""]),
		};
	}

	add() {
		this.setState({
			inputs: this.state.inputs.push(""),
		});
	}

	clear() {
		this.setState({
			inputs: List(),
		});
	}

	set(index: number, input: string) {
		this.setState({
			inputs: this.state.inputs.set(index, input),
		});
	}

	render() {
		return (
			<div className="TestInputEditor">
				<button className="btn btn-default" onClick={() => this.add()}>Add</button>
				<button className="btn btn-default" onClick={() => this.clear()}>Clear</button>
				<div className="input-box">
					<table className="table">
						<tbody>
							{this.state.inputs.map((input, index) => {
								const accepts = this.props.nfa.accepts(input);
								return (
									<tr key={index}>
										<td>
											<span
												className={"test-input-result glyphicon glyphicon-" + (accepts ? "ok" : "remove")
													+ (accepts ? " accept" : " reject")}
												title={accepts ? "Accepted" : "Rejected"}
											/>
										</td>
										<td>
											<input
												type="text"
												className="form-control"
												value={input}
												onChange={(e) => this.set(index, e.target.value)}
											/>
										</td>
										<td>
											<button className="btn btn-default" onClick={() => this.props.runOnInput(input)}>Visualize</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		);
	}
}