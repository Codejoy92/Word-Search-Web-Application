//-*- mode: rjsx-mode;

'use strict';

const React = require('react');

class Add extends React.Component {

  /** called with properties:
   *  app: An instance of the overall app.  Note that props.app.ws
   *       will return an instance of the web services wrapper and
   *       props.app.setContentName(name) will set name of document
   *       in content tab to name and switch to content tab.
   */
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.state = {error: []};
  }

  async handleChange(e){
  e.preventDefault();
  try{
  if(event.target.files[0]){
  let file = event.target.files[0]; 
  let fileName = file.name;
  let name = fileName.slice(0, fileName.lastIndexOf('.'));
  let fileContent = await readFile(file);
  await this.props.app.ws.addContent(name, fileContent);
  this.props.app.setContentName(name);
  }
  }catch(e){
    
        let err =[e.message || "Web Service Error"];
        console.log(err[0]); 
        this.setState({error : err[0]});
  }
  }

  //@TODO add code

  //Note that a you can get information on the file being uploaded by
  //hooking the change event on <input type="file">.  It will have
  //event.target.files[0] set to an object containing information
  //corresponding to the uploaded file.  You can get the contents
  //of the file by calling the provided readFile() function passing
  //this object as the argument.


  render() {
    return (<form>
            <label className="label">Choose File:<input className="control" type="file" onChange = {this.handleChange}/></label>
            <div className="error">{this.state.error}</div>               
            </form>);

  }

}

module.exports = Add;

/** Return contents of file (of type File) read from user's computer.
 *  The file argument is a file object corresponding to a <input
 *  type="file"/>
 */
async function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>  resolve(reader.result);
    reader.readAsText(file);
  });
}

