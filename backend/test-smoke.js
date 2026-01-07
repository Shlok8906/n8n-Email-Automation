import fetch from 'node-fetch';

const API = 'http://localhost:3000/api';

async function run() {
  // Test 1: regular instruction
  let res = await fetch(API + '/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Please send mail to test@example.com about the meeting.' })
  });
  let data = await res.json();
  console.log('test 1 response', data);

  // Test 2: explicit Subject line should not appear in body
  const msg = `Subject: Dinner Invitation\n\nDear Shlok Panchal,\n\nThis is to inform you that dinner is now ready.`;
  res = await fetch(API + '/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg })
  });
  data = await res.json();
  console.log('test 2 response', data);

  // Test 3: inline 'saying' pattern should become subject
  const msg2 = 'Please send mail to test@example.com saying Dinner Invitation';
  res = await fetch(API + '/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg2 })
  });
  data = await res.json();
  console.log('test 3 response', data);
}

run().catch((err) => { console.error(err); process.exit(1); });