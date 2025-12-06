const path = require('path');
const dotenv = require('dotenv');
const crypto = require('crypto-js');
const axios = require('axios');

// Load env
const envPath = path.resolve(__dirname, '../../.env');
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });

const AK = process.env.JIMENG_ACCESS_KEY || process.env.JIMENG_AK;
const SK = process.env.JIMENG_SECRET_KEY || process.env.JIMENG_SK;

if (!AK || !SK) {
    console.error("❌ Credentials missing. Please check .env");
    process.exit(1);
}

function hmac(key, msg) {
    return crypto.HmacSHA256(msg, key);
}

function sha256(msg) {
    return crypto.SHA256(msg);
}

function getSignatureKey(sk, dateStamp, regionName, serviceName) {
    // Try Standard Volcengine (Key = SK)
    let kDate = hmac(dateStamp, sk);
    let kRegion = hmac(regionName, kDate);
    let kService = hmac(serviceName, kRegion);
    let kSigning = hmac("request", kService);
    return kSigning;
}

// Option to test AWS4 prefix
function getSamepleKeyAWS(sk, dateStamp, regionName, serviceName) {
    let kDate = hmac(dateStamp, "AWS4" + sk);
    let kRegion = hmac(regionName, kDate);
    let kService = hmac(serviceName, kRegion);
    let kSigning = hmac("request", kService);
    return kSigning;
}

async function sendRequest(useAwsPrefix) {
    console.log(`\nTesting with AWS4 Prefix: ${useAwsPrefix}`);
    
    // 1. Prepare Data
    const method = 'POST';
    const endpoint = 'https://visual.volcengineapi.com';
    const path = '/';
    const service = 'cv';
    const region = 'cn-north-1';
    
    const action = 'CVSync2AsyncSubmitTask';
    const version = '2022-08-31';
    const query = { Action: action, Version: version };
    
    // STRICT BODY SERIALIZATION
    const bodyObj = {
        req_key: 'jimeng_t2i_v40',
        prompt: 'A cute cat',
    };
    // Ensure we sign the EXACT string we send
    const bodyString = JSON.stringify(bodyObj); 
    
    // 2. Time
    const now = new Date();
    const datetime = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHmmssZ
    const date = datetime.substr(0, 8); // YYYYMMDD

    // 3. Canonical Request
    // Headers (lowercase, sorted)
    const host = 'visual.volcengineapi.com';
    const contentType = 'application/json';
    
    const canonicalHeaders = 
        `content-type:${contentType}\n` +
        `host:${host}\n` +
        `x-date:${datetime}\n`;
        
    const signedHeaders = 'content-type;host;x-date';
    
    const payloadHash = sha256(bodyString).toString(crypto.enc.Hex);
    
    const canonicalQuery = `Action=${action}&Version=${version}`; // Manual sort if needed, here simple
    
    const canonicalRequest = [
        method,
        path,
        canonicalQuery,
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join('\n');
    
    console.log("Canonical Request Hash:", sha256(canonicalRequest).toString(crypto.enc.Hex));

    // 4. String to Sign
    const credentialScope = `${date}/${region}/${service}/request`;
    const algorithm = "HMAC-SHA256";
    const stringToSign = [
        algorithm,
        datetime,
        credentialScope,
        sha256(canonicalRequest).toString(crypto.enc.Hex)
    ].join('\n');

    // 5. Signature
    let signingKey;
    if (useAwsPrefix) {
        signingKey = getSamepleKeyAWS(SK, date, region, service);
    } else {
        signingKey = getSignatureKey(SK, date, region, service);
    }
    
    const signature = hmac(stringToSign, signingKey).toString(crypto.enc.Hex);
    
    const authorization = `${algorithm} Credential=${AK}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // 6. Send
    try {
        const response = await axios.post(endpoint, bodyString, { // SEND STRING
            params: query,
            headers: {
                'Authorization': authorization,
                'Content-Type': contentType,
                'Host': host,
                'X-Date': datetime
            }
        });
        console.log("✅ SUCCESS! Status:", response.status);
        console.log("Data:", JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        console.log("❌ FAILED. Status:", error.response?.status);
        if (error.response?.data?.ResponseMetadata?.Error) {
             console.log("Error Code:", error.response.data.ResponseMetadata.Error.Code);
             console.log("Error Msg:", error.response.data.ResponseMetadata.Error.Message);
        }
        return false;
    }
}

async function run() {
    // Try Standard (No Prefix) - FAILED previously
    // const success1 = await sendRequest(false);
    // if (success1) return;
    
    // Try AWS4 Prefix
    console.log("👉 Trying with AWS4 Prefix...");
    await sendRequest(true); 
}

run();
