const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules/@volcengine/openapi/lib/base/sign.js');
try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(content);
} catch (e) {
    console.error("Error reading file:", e.message);
}
