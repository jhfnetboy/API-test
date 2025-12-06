const dotenv = require('dotenv');
const path = require('path');
const Service = require('@volcengine/openapi/lib/base/service').default;

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AK = process.env.JIMENG_ACCESS_KEY || process.env.JIMENG_AK;
const SK = process.env.JIMENG_SECRET_KEY || process.env.JIMENG_SK;

if (!AK || !SK) {
    console.error("Credentials missing");
    process.exit(1);
}

// Helper to run test
async function runTest(label, options) {
    console.log(`\n👉 Testing: ${label}`);
    try {
        class CVService extends Service {
            constructor() {
                super({
                    accessKeyId: AK,
                    secretKey: SK,
                    sessionToken: undefined,
                    region: 'cn-north-1',
                    host: 'visual.volcengineapi.com',
                    scheme: 'https',
                    serviceName: 'cv'
                });
            }
        }
        const service = new CVService();
        
        const action = 'CVSync2AsyncSubmitTask';
        const version = '2022-08-31';
        
        // Base config
        const reqConfig = {
            Action: action,
            Version: version,
            method: 'POST', 
            query: { Action: action, Version: version },
            body: { req_key: 'jimeng_t2i_v40', prompt: 'A cute cat' },
            ...options
        };

        const res = await service.fetchOpenAPI(reqConfig);
        
        if (res.ResponseMetadata && res.ResponseMetadata.Error) {
             console.log(`❌ Failed (${res.ResponseMetadata.Error.Code})`);
             return false;
        } else {
             console.log("✅ Success!");
             return true;
        }

    } catch (e) {
        console.log("❌ Exception:", e.message);
        return false;
    }
}

async function main() {
    // 1. Default (No explicit headers, object body)
    await runTest("Default SDK Behavior", {});
    
    // 2. Explicit JSON Header
    await runTest("Explicit Content-Type: application/json", {
        headers: { 'Content-Type': 'application/json' }
    });

    // 3. Explicit JSON UTF-8 Header
    await runTest("Explicit Content-Type: application/json; charset=utf-8", {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
    
    // 4. String Body + Explicit Header
    await runTest("String Body + JSON Header", {
        body: JSON.stringify({ req_key: 'jimeng_t2i_v40', prompt: 'A cute cat' }),
        headers: { 'Content-Type': 'application/json' }
    });
}

main();
