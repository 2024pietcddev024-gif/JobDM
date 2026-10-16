function toCppLiteral(val) {
  if (Array.isArray(val)) {
    return '{' + val.map(toCppLiteral).join(', ') + '}';
  }
  if (typeof val === 'string') {
    return '"' + val.replace(/"/g, '\\"') + '"';
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return String(val);
  }
  return String(val);
}

const inputs = [ [ [ 2, 7, 11, 15 ], 9 ], [ [ [ 1, 3 ], [ 2, 1 ] ], 5 ], [ [ '192.168.1.1 FAILED', '10.0.0.1 SUCCESS' ] ] ];

inputs.forEach(args => {
  console.log(args.map(toCppLiteral).join(', '));
});
