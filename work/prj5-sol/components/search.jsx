//-*- mode: rjsx-mode;

'use strict';

const React = require('react');

class Search extends React.Component {

  /** called with properties:
   *  app: An instance of the overall app.  Note that props.app.ws
   *       will return an instance of the web services wrapper and
   *       props.app.setContentName(name) will set name of document
   *       in content tab to name and switch to content tab.
   */
  constructor(props) {
	super(props);
	this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  handleKeyPress(e){
		e.preventDefault();
		if(e.target.value === undefined){
			let value = this.props.app.ws.searchDocs(e.target.searchname.value, 0);
			console.log(value);
		}else{
			let value = this.props.app.ws.searchDocs(e.target.value, 0);
			console.log(value);
		}
		
  }

  render() {
     return (
		<form onSubmit = {this.handleKeyPress}>
			<label>
				<span class="label">Search Terms:</span>
			</label>
			<span className="control">
				<input name ="searchname" type="text"  onBlur = {this.handleKeyPress}/>
			</span>
		</form>
		);
	}
}
module.exports = Search;

