var { expect:customExpect } = require('chai');
const fsPromises = require('fs').promises
// var expect = chai.expect;
// var assert = chai.assert;
var JavascriptHelper = require('../../src/helpers/javaScriptHelpers');

describe('JavascriptHelper : executeSingleFunction', function() {

  it('should throw an exception if parameters are missing', async function() {
    var ex;
    try{
      var javascriptHelper = new JavascriptHelper();
      await javascriptHelper.executeSingleFunction();
    }catch(e){
      ex = e;
    };
    customExpect(ex !== undefined, "exception was expected if alias is null").to.eql(true);

    ex;
    try{
      var javascriptHelper = new JavascriptHelper();
      await javascriptHelper.executeSingleFunction("foo");
    }catch(e){
      ex = e;
    };
    customExpect(ex !== undefined, "exception was expected if script is null").to.eql(true);

  });

  it('should execute a function with math return', async function() {
    var javascriptHelper = new JavascriptHelper();
    var variables = {
      a:5,
      b:6
    }
    var response = await javascriptHelper.executeSingleFunction("return eventContext.a+eventContext.b;", variables);
    customExpect(response).to.eql(11);
  });

  it('should execute a function with string return', async function() {
    var javascriptHelper = new JavascriptHelper();
    var variables = {
      a:"5",
      b:"6"
    }
    var response = await javascriptHelper.executeSingleFunction("return eventContext.a+eventContext.b;", variables);
    customExpect(response).to.eql("56");
  });

  it('should execute a function with boolean return', async function() {
    var javascriptHelper = new JavascriptHelper();
    var variables = {
      a:false,
      b:"6"
    }
    var response = await javascriptHelper.executeSingleFunction("return eventContext.a", variables);
    customExpect(typeof response).to.eql("boolean");
    customExpect(response).to.eql(false);
  });
  it('should execute a function with conditionl parms and should return a object', async function() {
    var javascriptHelper = new JavascriptHelper();
    
    
    var eventContext = {
        httpRequest : {
            body : {
                sex: "F"
            }
        }
    };

    const customFnString = `
        var request = {};

        if(eventContext.httpRequest.body.sex === 'M'){
          request.sexo = 1;
        }else if(eventContext.httpRequest.body.sex === 'F'){
          request.sexo = 2;
        }
        return request.sexo;
    `
    var response = await javascriptHelper.executeSingleFunction(customFnString , eventContext);
    customExpect(response).to.eql(2);
  });
});