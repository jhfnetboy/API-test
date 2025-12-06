const dotenv = require('dotenv');
const path = require('path');
// Direct import of base service
const Service = require('@volcengine/openapi/lib/base/service').default;

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AK = process.env.JIMENG_ACCESS_KEY || process.env.JIMENG_AK;
const SK = process.env.JIMENG_SECRET_KEY || process.env.JIMENG_SK;

if (!AK || !SK) {
    console.error("Credentials missing");
    process.exit(1);
}

console.log("Service Class:", Service);

try {
    // Custom Service for CV
    class CVService extends Service {
        constructor() {
            super({
                accessKeyId: AK,
                secretKey: SK,
                sessionToken: undefined,
                region: 'cn-north-1',
                host: 'visual.volcengineapi.com',
                scheme: 'https',
                serviceName: 'cv' // Critical for signature
            });
        }
    }

    const service = new CVService();
    
    async function main() {
        console.log("🚀 Testing with Custom SDK Service...");
        
        const params = {
            Action: 'CVSync2AsyncSubmitTask',
            Version: '2022-08-31',
            req_key: 'jimeng_t2i_v40',
            prompt: 'A cute cat'
        };
        
        try {
            // Try defining the API action specifically
            // The base Service usually has 'createRequest' or handles 'json' requests
            // Let's try specifying method and separating query/body
            
            const action = 'CVSync2AsyncSubmitTask';
            const query = {
                Action: action,
                Version: '2022-08-31'
            };
            const body = {
                req_key: 'jimeng_t2i_v40',
                prompt: 'A cute cat'
            };

            // Attempt 1: Using fetchOpenAPI with options
            // Signature usually: fetchOpenAPI(action, params, options) or fetchOpenAPI(options)
            // Let's rely on standard 'Service' behavior:
            // It often has .post(action, params) or similar?
            
            // Let's try the generic 'request' method if available, or fetchOpenAPI with full config
            const res = await service.fetchOpenAPI({
                Action: action,
                Version: '2022-08-31',
                method: 'POST', // Explicit method
                query: query,   // Explicit query
                body: body      // Explicit body
            });
            
            console.log("✅ SDK Success!");
            console.log(JSON.stringify(res, null, 2));

        } catch (err) {
            console.error("❌ SDK Error:", err);
        }
    }
    
    main();

} catch (e) {
    console.error("SDK Setup Error:", e);
}
