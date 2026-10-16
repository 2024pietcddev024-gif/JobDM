const input1 = 'nums = [2,7,11,15], target = 9';
const input2 = '[[1, 3], [2, 1], [1, 2]], 5';
const input3 = "['192.168.1.1 FAILED', '10.0.0.1 SUCCESS']";

function parseInput(inputStr) {
  let stripped = inputStr.replace(/[a-zA-Z_]+\s*=\s*/g, '');
  stripped = stripped.replace(/'/g, '"');
  return JSON.parse('[' + stripped + ']');
}

console.log(parseInput(input1));
console.log(parseInput(input2));
console.log(parseInput(input3));
