const path = require('path');
const dotenv = require('dotenv');
const Signer = require('./signer');
const axios = require('axios');

// Load env
const envPath = path.resolve(__dirname, '../../.env');
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });

const AK = process.env.JIMENG_ACCESS_KEY || process.env.JIMENG_AK;
const SK = process.env.JIMENG_SECRET_KEY || process.env.JIMENG_SK;

console.log("AK:", AK ? `${AK.substring(0, 4)}...` : "MISSING");
console.log("SK:", SK ? "PRESENT" : "MISSING");

if (!AK || !SK) {
    console.error("❌ Credentials missing. Please check .env");
    process.exit(1);
}

const signer = new Signer({
    ak: AK,
    sk: SK,
    service: 'cv',
    region: 'cn-north-1',
    host: 'visual.volcengineapi.com'
});

async function testApi() {
    const action = 'CVSync2AsyncSubmitTask';
    const version = '2022-08-31';
    
    // Simple text-only prompt
    const body = {
        req_key: 'jimeng_t2i_v40',
        prompt: 'A cute cat',
    };
    
    const query = {
        Action: action,
        Version: version
    };

    console.log("\n🚀 Sending Test Request...");
    try {
        const authData = signer.sign('POST', '/', query, {}, body);
        
        console.log("URL:", 'https://visual.volcengineapi.com');
        console.log("Authorization:", authData.authorization);

        const response = await axios.post('https://visual.volcengineapi.com', body, {
            params: query,
            headers: {
                'Authorization': authData.authorization,
                'Content-Type': 'application/json',
                'Host': authData.host,
                'X-Date': authData['x-date']
            }
        });

        console.log("\n✅ Success!");
        console.log("Status:", response.status);
        console.log("Data:", JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error("\n❌ Request Failed!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Headers:", error.response.headers);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error:", error.message);
        }
    }
}

testApi();
