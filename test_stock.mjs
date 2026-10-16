

const API_URL = 'http://localhost:3001/api';

async function req(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  console.log('Fetching problems...');
  const { data } = await req('GET', '/code/problems');
  const stockProb = data.problems.find(p => p.title === 'Best Time to Buy and Sell Stock');
  
  if (!stockProb) {
    console.error('❌ Stock problem not found!');
    return;
  }
  
  console.log(`Problem ID: ${stockProb.id}`);
  console.log(`Examples present: ${stockProb.examples && stockProb.examples.length > 0 ? 'Yes (' + stockProb.examples.length + ')' : 'No'}`);
  
  console.log('\nTesting Run Code (Correct Python)...');
  const code = `class Solution:
    def maxProfit(self, prices):
        min_price = float('inf')
        profit = 0
        for price in prices:
            if price < min_price:
                min_price = price
            else:
                profit = max(profit, price - min_price)
        return profit`;
        
  const runRes = await req('POST', '/code/run', {
    language: 'Python',
    code: code,
    problemId: stockProb.id
  });
  
  console.log(`Run status: ${runRes.status}`);
  console.log(`Run result:`, runRes.data);
  
  console.log('\nTesting Run Code (Incorrect Python)...');
  const badCode = `class Solution:
    def maxProfit(self, prices):
        return 0`;
        
  const badRunRes = await req('POST', '/code/run', {
    language: 'Python',
    code: badCode,
    problemId: stockProb.id
  });
  
  console.log(`Bad run status: ${badRunRes.status}`);
  console.log(`Bad run result status: ${badRunRes.data.status}`);
}

run();
