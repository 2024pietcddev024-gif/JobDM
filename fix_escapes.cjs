const fs = require('fs');
let c = fs.readFileSync('./server/services/executionWrappers.js', 'utf8');
// The issue is `\"` inside template literals getting emitted as `"` instead of `\"` in the final code strings.
// Specifically, `std::string toJson(const std::string& val) { return "\"" + val + "\""; }` should be `std::string toJson(const std::string& val) { return "\\\"" + val + "\\\""; }`
// Actually, it's safer to just replace all `\"` with `\\\"` in the file.
c = c.replace(/\\"/g, '\\\\"');
fs.writeFileSync('./server/services/executionWrappers.js', c);
