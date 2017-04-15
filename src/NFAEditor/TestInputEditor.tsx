import * as React from 'react';
import RunnableNFA from '../Core/RunnableNFA';
import {List} from 'immutable';

type CProps = {
	nfa: RunnableNFA,
	runOnInput: (input: string) => any,
};
type CState = {
	inputs: List<string>,
};

export default class TestInputEditor extends React.PureComponent<CProps, CState> {
	constructor(props: CProps) {
		super(props);

		this.state = {
			inputs: List([""]),
		}
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
			<div>
				<label>Test inputs</label>
				<button className="btn btn-default" onClick={() => this.add()}>Add</button>
				<button className="btn btn-default" onClick={() => this.clear()}>Clear</button>
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
		);
	}
}