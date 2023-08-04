const { exec } = require('child_process')
const util = require('util')
const execute = util.promisify(exec);

function JavaScriptHelpers() {

  this.executeSingleFunction = async (functionString: string, variables: any) => {

    if (typeof functionString === "undefined" || functionString === "") {
      throw new Error("function content is required");
    }

    //create an array of variable names and at the end, the script
    //https://stackoverflow.com/a/4183662/3957754
    // var keys = Object.keys(variables);
    var keys = ["eventContext"];
    //add the script
    keys.push(functionString);
    var someJsFunction = Function.apply(null, keys);
    return await someJsFunction(variables);

  }

}

module.exports = JavaScriptHelpers;