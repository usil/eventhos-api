import { objectObfuscate, paginator, stringObfuscate } from './../../src/helpers/general';

describe('Paginates correctly', () => {
  const testArray = [0, 1, 2];
  const pageSizeZero = 0;
  const pageSizeOne = 1;

  it('Correct Total Number', () => {
    const result = paginator(testArray);
    expect(result.pagination.totalElements).toBe(testArray.length);
  });

  it('Correct Number Of Pages', () => {
    const result = paginator(testArray, pageSizeOne);
    expect(result.pagination.totalPages).toBe(testArray.length / pageSizeOne);
  });

  it('Correct Content', () => {
    const result = paginator(testArray);
    expect(result.content[0].length).toBe(2);
  });

  it('Fake Pagination', () => {
    const result = paginator(testArray, pageSizeZero);
    expect(result.content).toBe(testArray);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.totalElements).toBe(testArray.length);
  });
});

describe('Replace raw sensitive params correctly on url path', () => {
  it('It must return the same text if the empty sensible parameters are sent', () => {
    let rawSensibleParams = '';
    let text= `http://localhost:2109/event/send?event-identifier=evento_new-Hsas&access-key=eyJhbGciOi`;
    const resp = stringObfuscate(rawSensibleParams, text)
    expect(resp).toBe(text)
  });
  it('It must return the same text if the sensitive parameters are sent with null value', () => {
    let rawSensibleParams = null;
    let text= `http://localhost:2109/event/send?event-identifier=evento_new-HN4TQ&access-key=eyJhbGciO`;
    const resp = stringObfuscate(rawSensibleParams, text)
    expect(resp).toBe(text)
  });
  it('It must return the same text if the sensitive parameters are sent with an undefined value.', () => {
    let rawSensibleParams = undefined;
    let text= `http://localhost:2109/event/send?event-identifier=evento_new-H26Q&access-key=eyJhbGciOi`;
    const resp = stringObfuscate(rawSensibleParams, text)
    expect(resp).toBe(text)
  });
  it('Must return the values ​​of the keys with **** if the keys exist', () => {
    let rawSensibleParams = "event-identifier, access-key";
    let text= `http://localhost:2109/event/send?event-identifier=evento_newL26Q&access-key=eyJhbGciO`;
    const resp = stringObfuscate(rawSensibleParams, text)
    const mockResp = 'http://localhost:2109/event/send?event-identifier=****&access-key=****'
    expect(resp).toBe(mockResp)
  });
  it('Should return the same text if the keys do not exist within the text', () => {
    let rawSensibleParams = "event-new, access-nokey";
    let text= `http://localhost:2109/event/send?event-identifier=evento_new-HN6Q&access-key=eyJhbGciOiJI`;
    const resp = stringObfuscate(rawSensibleParams, text)
    expect(resp).toBe(text)
  });
  it('It should return the values ​​of the keys with **** despite sending strange parameters as spaces', () => {
    let rawSensibleParams = "event -identi fier,  access-key ";
    let text= `http://localhost:2109/event/send?event-identifier=evento_newL26Q&access-key=eyJhbGciOiJ`;
    const mockResp = 'http://localhost:2109/event/send?event-identifier=****&access-key=****'
    const resp = stringObfuscate(rawSensibleParams, text)
    expect(resp).toBe(mockResp)
  });
  it('Keys must be independent, if only some keys exist within the text, they must be modified with ****', () => {
    let rawSensibleParams = "event-identifier,no-existe";
    let text= `http://localhost:2109/event/send?event-identifier=evento_new-JKL26Q&access-key=eyJhbdsdsdeo`;
    const mockResp = 'http://localhost:2109/event/send?event-identifier=****&access-key=eyJhbdsdsdeo'
    const resp = stringObfuscate(rawSensibleParams, text)
    expect(resp).toBe(mockResp)
  });
  it('If there are no keys within the text then you should not make any changes', () => {
    let rawSensibleParams = "event-identifier,no-existe";
    let text= `http://localhost:2109/send`
    const resp = stringObfuscate(rawSensibleParams, text)
    expect(resp).toBe(text)
  });
  it('If the raw sensible params is empty and text is empty, it should be return the seim text', () => {
    let rawSensibleParams = "";
    let text= "";
    const resp = stringObfuscate(rawSensibleParams, text)
    expect(resp).toBe(text)
  });
  it('If text is not a string, it should be the seim value', () => {
    let rawSensibleParams = "";
    let text= {};
    let resp = stringObfuscate(rawSensibleParams, text as string)
    expect(resp).toBe(text)
    text= {auth: "dfdsf"};
    resp = stringObfuscate(rawSensibleParams, text as string)
    expect(resp).toBe(text)
    text= [454,"dfssdf", 45];
    resp = stringObfuscate(rawSensibleParams, text as string)
    expect(resp).toBe(text)
  });
});


describe('Replace raw sensitive params correctly on headers', () => {
  it('It must return the same object if the empty sensible parameters are sent', () => {
    let rawSensibleParams = '';
    let object= {authorization: "secret-secret", "no-secret": "publicc", accessKey: "secreeet"};
    const resp = objectObfuscate(rawSensibleParams, object)
    expect(resp).toBe(object)
  });
  it('It must return the same object if the sensitive parameters are sent with null value', () => {
    let rawSensibleParams = null;
    let object= {authorization: "secret-secret", "no-secret": "publicc", accessKey: "secreeet"};
    const resp = objectObfuscate(rawSensibleParams, object)
    expect(resp).toBe(object)
  });
  it('It must return the same object if the sensitive parameters are sent with an undefined value.', () => {
    let rawSensibleParams = undefined;
    let object= {authorization: "secret-secret", "no-secret": "publicc", accessKey: "secreeet"};
    const resp = objectObfuscate(rawSensibleParams, object)
    expect(resp).toBe(object)
  });
  it('Must return the values ​​of the keys with **** if the keys exist', () => {
    let rawSensibleParams = "authorization, accessKey, event-key";
    let object= {authorization: "secret-secret", "no-secret": "publicc", accessKey: "secreeet", "event-key": 5515, test:"50"};
    const resp = objectObfuscate(rawSensibleParams, object)
    const mockResp = {authorization: "****", "no-secret": "publicc", accessKey: "****", "event-key": "****", test:"50"};
    expect(resp).toStrictEqual(mockResp)
  });
  it('Should return the same object if the keys do not exist within the text', () => {
    let rawSensibleParams = "eventno-new, access-nokey";
    let object= {authorization: "secret-secret", "no-secret": "publicc", accessKey: "secreeet", "event-key": 5515, test:"50"};
    const resp = objectObfuscate(rawSensibleParams, object)
    expect(resp).toStrictEqual(object)
  });
  it('It should return the values ​​of the keys with **** despite sending strange parameters as spaces', () => {
    let rawSensibleParams = "autho rization, acces sKey, event- key ";
    let object= {authorization: "secret-secret", "no-secret": "publicc", accessKey: "secreeet", "event-key": 5515, test:"50"};
    const resp = objectObfuscate(rawSensibleParams, object)
    const mockResp = {authorization: "****", "no-secret": "publicc", accessKey: "****", "event-key": "****", test:"50"};
    expect(resp).toStrictEqual(mockResp)
  });
  it('Keys must be independent, if only some keys exist within the text, they must be modified with ****', () => {
    let rawSensibleParams = "authorization, accesnosKey, event-key ";
    let object= {authorization: "secret-secret", "no-secret": "publicc", accessKey: "secreeet", "event-key": 5515, test:"50"};
    const resp = objectObfuscate(rawSensibleParams, object)
    const mockResp = {authorization: "****", "no-secret": "publicc", accessKey: "secreeet", "event-key": "****", test:"50"};
    expect(resp).toStrictEqual(mockResp)

  });
  it('If there are no elements in object, should be return the same object', () => {
    let rawSensibleParams = "event-identifier,no-existe";
    let object= {}
    const resp = objectObfuscate(rawSensibleParams, object)
    expect(resp).toBe(object)
  });
  it('If the raw sensible params is empty and object is empty, it should be return the seim object', () => {
    let rawSensibleParams = "";
    let object= {}
    const resp = objectObfuscate(rawSensibleParams, object)
    expect(resp).toBe(object)
  });
  it('If the object is null, undefined or string, it should be the seim value', () => {
    let rawSensibleParams = "auth, keys-value";
    let object: any= undefined;
    let resp = objectObfuscate(rawSensibleParams, object as unknown as {});
    expect(resp).toBe(object);
    object= null;
    resp = objectObfuscate(rawSensibleParams, object as unknown as {});
    expect(resp).toBe(object);

    object= "text diferent";
    resp = objectObfuscate(rawSensibleParams, object as unknown as {});
    expect(resp).toBe(object);
  });
});

