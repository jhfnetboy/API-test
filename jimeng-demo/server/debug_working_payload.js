const https = require('https');
const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AK = process.env.JIMENG_ACCESS_KEY || process.env.JIMENG_AK;
const SK = process.env.JIMENG_SECRET_KEY || process.env.JIMENG_SK;

if (!AK || !SK) {
    console.error("Credentials missing");
    process.exit(1);
}

function sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

function hmac(key, str) {
    return crypto.createHmac('sha256', key).update(str).digest();
}

async function sendRequest() {
    console.log("👉 Testing Full Payload POST with Manual Signer...");
    
    // 1. Parameters
    const method = 'POST';
    const host = 'visual.volcengineapi.com';
    const path = '/';
    const service = 'cv';
    const region = 'cn-north-1';
    const action = 'CVSync2AsyncSubmitTask';
    const version = '2022-08-31';

    // 2. Date
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHmmssZ
    const dateStamp = amzDate.substr(0, 8);

    // 3. Body (Real Payload)
    const bodyObj = {
        req_key: "jimeng_t2i_v40",
        prompt: "A cute cat in space"
    }; 
    // CRITICAL: We sign EXACTLY what we send.
    const bodyStr = JSON.stringify(bodyObj); 
    
    // 4. Canonical Request
    const canonicalQuery = `Action=${action}&Version=${version}`;
    
    // Headers: content-type, host, x-date (sorted)
    const canonicalHeaders = 
        `content-type:application/json\n` +
        `host:${host}\n` +
        `x-date:${amzDate}\n`;
        
    const signedHeaders = 'content-type;host;x-date';
    
    const payloadHash = sha256(bodyStr);
    
    const canonicalRequest = 
        method + '\n' +
        path + '\n' +
        canonicalQuery + '\n' +
        canonicalHeaders + '\n' +
        signedHeaders + '\n' +
        payloadHash;

    // 5. String to Sign
    const algorithm = 'HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/request`;
    const stringToSign = 
        algorithm + '\n' +
        amzDate + '\n' +
        credentialScope + '\n' +
        sha256(canonicalRequest);
        
    // 6. Signature Calculation
    const kDate = hmac(SK, dateStamp); 
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    const kSigning = hmac(kService, 'request');
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorization = `${algorithm} Credential=${AK}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    console.log("Date:", amzDate);
    console.log("Authorization:", authorization);
    
    // 7. Send Request
    const options = {
        hostname: host,
        port: 443,
        path: `${path}?${canonicalQuery}`,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Host': host,
            'X-Date': amzDate,
            'Authorization': authorization
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
             console.log(`\nStatus: ${res.statusCode}`);
             try {
                const json = JSON.parse(data);
                console.log(JSON.stringify(json, null, 2));
             } catch(e) {
                 console.log(data);
             }
        });
    });
    
    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });
    
    req.write(bodyStr);
    req.end();
}

sendRequest();
