import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/analyze.js';

test('rejects requests without both coin sides', async()=>{
  let statusCode,body;
  const res={status(code){statusCode=code;return this},json(value){body=value;return this}};
  await handler({method:'POST',body:{images:['data:image/jpeg;base64,AA==']}},res);
  assert.equal(statusCode,400);
  assert.match(body.error,/líce a rub/i);
});

test('rejects a non-image payload', async()=>{
  let statusCode;
  const res={status(code){statusCode=code;return this},json(){return this}};
  await handler({method:'POST',body:{images:['text','text']}},res);
  assert.equal(statusCode,400);
});

test('does not expose analysis without gateway configuration', async()=>{
  const previous=process.env.AI_GATEWAY_API_KEY;
  delete process.env.AI_GATEWAY_API_KEY;
  let statusCode;
  const res={status(code){statusCode=code;return this},json(){return this}};
  await handler({method:'POST',body:{images:['data:image/jpeg;base64,AA==','data:image/jpeg;base64,AA==']}},res);
  assert.equal(statusCode,503);
  if(previous)process.env.AI_GATEWAY_API_KEY=previous;
});
