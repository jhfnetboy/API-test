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
    
    async function main() {
        console.log("🚀 Testing with String Body...");
        
        const action = 'CVSync2AsyncSubmitTask';
        const version = '2022-08-31';
        
        const query = {
            Action: action,
            Version: version
        };

        // Serialize manually to ensure consistency
        const bodyObj = {
            req_key: 'jimeng_t2i_v40',
            prompt: 'A cute cat'
        };
        const bodyString = JSON.stringify(bodyObj);

        try {
            const res = await service.fetchOpenAPI({
                Action: action,
                Version: version,
                method: 'POST', 
                query: query,   
                body: bodyString, // Pass STRING
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log("✅ SDK Success with String Body!");
            console.log(JSON.stringify(res, null, 2));

        } catch (err) {
            console.error("❌ SDK Error:", err);
            // Print extra info if available
            if (err.response && err.response.text) {
                try {
                     const txt = await err.response.text();
                     console.log("Response Text:", txt);
                } catch(e){}
            }
        }
    }
    
    main();

} catch (e) {
    console.error("SDK Setup Error:", e);
}
