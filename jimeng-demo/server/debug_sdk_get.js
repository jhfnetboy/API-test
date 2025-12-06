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
                serviceName: 'cv'
            });
        }
    }

    const service = new CVService();
    
    async function main() {
        console.log("🚀 Testing GET Request (GetCVTaskResult)...");
        
        try {
            // GET request shouldn't suffer from body serialization issues
            const res = await service.fetchOpenAPI({
                Action: 'GetCVTaskResult',
                Version: '2022-08-31',
                method: 'GET', 
                query: {
                    Action: 'GetCVTaskResult',
                    Version: '2022-08-31',
                    task_id: 'fake_task_id_12345'
                }
            });
            
            console.log("✅ GET Request Signed Successfully!");
            console.log("Note: It might return 'Task Not Found', which is GOOD. It means Auth passed.");
            console.log(JSON.stringify(res, null, 2));

        } catch (err) {
            console.error("❌ GET Request Failed:", err);
        }
    }
    
    main();

} catch (e) {
    console.error("SDK Setup Error:", e);
}
