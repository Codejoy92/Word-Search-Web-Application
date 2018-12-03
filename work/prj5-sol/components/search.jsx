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
	if (e.key === 'Enter') {
		alert('do validate');
       }
  }

  render() {
     return (<div>
		<b>Search terms:</b>
		<input type="text" onKeyPress={this.handleKeyPress}/>
	    </div>);
	}
}
module.exports = Search;

