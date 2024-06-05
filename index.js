var first = (seq) => seq[0];
var rest = (seq) => seq.slice(1);
var map = (...args) =>{
  let [fn, arr] = args;
  if (args.length === 1) {
    return coll => map(fn, coll);
  }
  return arr.map(fn);
}

var isFn = (value) => typeof value === 'function';

var mongodb = require('mongodb');

var createDb = (url) => new mongodb.MongoClient(url);

var connectDb = (client)=> client.connect();

var disconnectDb = (client) => client.close();

var getDb = (nameDb, client) => client.db(nameDb);  

var coll = (nameDb, coll, client) => {
  return getDb(nameDb, client).collection(coll);    
};

var find = (spec, client)=>{
  if(isFn(client)) (client=client());  
  return coll(spec.$db, spec.$coll, client).find(spec.$where).toArray();  
}

var query = (spec, client)=>{
  if(isFn(client)) (client=client());  
  return coll(first(spec).$db, first(spec).$coll, client).aggregate(rest(spec)).toArray();  
}

var extendOperation = ({upsert}) => {
  return (op, i) => { // map  array
    let [[key, value]] = Object.entries(op);    
    let operation = {
      "$create" : { insertOne: { document: value } },
      "$update": { updateOne:{ filter: value.$match, update: value.$set, upsert: upsert }},
      "$updateMany": { updateMany:{ filter: value.$match, update: value.$set } },
      "$delete":{ deleteOne: { filter: value.$match } },
      "$deleteMany": { deleteMany: { filter: value.$match } }
    };
    if(operation[key]) return operation[key];
    return op;
  }
}

var transact = (spec, client)=>{
  if(isFn(client)) (client=client());
  let operation = map(extendOperation({upsert: spec.upsert}), rest(spec));
  return coll(first(spec).$db, first(spec).$coll, client).bulkWrite(operation);
}

module.exports = {
  createDb,
  connectDb,
  getDb,
  coll,
  find,
  query,
  find,
  transact
}
