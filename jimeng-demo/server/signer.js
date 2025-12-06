const crypto = require('crypto-js');

function hmac(key, msg) {
    return crypto.HmacSHA256(msg, key);
}

function sha256(msg) {
    return crypto.SHA256(msg);
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
    const kDate = hmac(dateStamp, key);
    const kRegion = hmac(regionName, kDate);
    const kService = hmac(serviceName, kRegion);
    const kSigning = hmac("request", kService);
    return kSigning;
}

class Signer {
    constructor(config) {
        this.ak = config.ak;
        this.sk = config.sk;
        this.region = config.region || 'cn-north-1';
        this.service = config.service || 'cv';
        this.host = config.host || 'visual.volcengineapi.com';
    }

    sign(method, path, query, headers, body) {
        const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHmmssZ
        const date = datetime.substr(0, 8); // YYYYMMDD

        // 1. Canonical Request
        const canonicalUri = path;
        const canonicalQuery = Object.keys(query).sort().map(key => 
            `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`
        ).join('&');
        
        // Headers must be lowercase and sorted
        const explicitHeaders = {
            'content-type': 'application/json',
            'host': this.host,
            'x-date': datetime,
            ...headers
        };
        
        const signedHeaders = Object.keys(explicitHeaders).sort().join(';');
        const canonicalHeaders = Object.keys(explicitHeaders).sort().map(key => 
            `${key}:${explicitHeaders[key]}\n`
        ).join('');

        const payloadHash = sha256(JSON.stringify(body)).toString(crypto.enc.Hex);
        
        const canonicalRequest = [
            method,
            canonicalUri,
            canonicalQuery,
            canonicalHeaders,
            signedHeaders,
            payloadHash
        ].join('\n');

        // 2. String to Sign
        const credentialScope = `${date}/${this.region}/${this.service}/request`;
        const algorithm = "HMAC-SHA256";
        const stringToSign = [
            algorithm,
            datetime,
            credentialScope,
            sha256(canonicalRequest).toString(crypto.enc.Hex)
        ].join('\n');

        // 3. Signature
        const signingKey = getSignatureKey(this.sk, date, this.region, this.service);
        const signature = hmac(stringToSign, signingKey).toString(crypto.enc.Hex);

        // 4. Authorization Header
        const authorization = `${algorithm} Credential=${this.ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        return {
            authorization,
            'x-date': datetime,
            'host': this.host,
            // Return validation info
            debug: {
                stringToSign,
                canonicalRequest
            }
        };
    }
}

module.exports = Signer;
