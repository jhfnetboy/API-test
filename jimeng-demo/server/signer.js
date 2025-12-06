const crypto = require('crypto');

class Signer {
    constructor(config) {
        this.ak = config.ak;
        this.sk = config.sk;
        this.service = config.service || 'cv';
        this.region = config.region || 'cn-north-1';
        this.host = config.host || 'visual.volcengineapi.com';
    }

    sha256(str) {
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    hmac(key, str) {
        return crypto.createHmac('sha256', key).update(str).digest();
    }

    // bodyStr must be the exact JSON string that will be sent
    sign(method, path, query, bodyStr) {
        // 1. Date
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHmmssZ
        const dateStamp = amzDate.substr(0, 8);

        // 2. Canonical Request
        // Sort query params
        const sortedQueryKeys = Object.keys(query).sort();
        const canonicalQuery = sortedQueryKeys.map(key => `${key}=${query[key]}`).join('&');

        // Headers (fixed set for simplicity and robustness)
        const canonicalHeaders = 
            `content-type:application/json\n` +
            `host:${this.host}\n` +
            `x-date:${amzDate}\n`;
            
        const signedHeaders = 'content-type;host;x-date';
        
        const payloadHash = this.sha256(bodyStr);
        
        const canonicalRequest = 
            method + '\n' +
            path + '\n' +
            canonicalQuery + '\n' +
            canonicalHeaders + '\n' +
            signedHeaders + '\n' +
            payloadHash;

        // 3. String to Sign
        const algorithm = 'HMAC-SHA256';
        const credentialScope = `${dateStamp}/${this.region}/${this.service}/request`;
        const stringToSign = 
            algorithm + '\n' +
            amzDate + '\n' +
            credentialScope + '\n' +
            this.sha256(canonicalRequest);

        // 4. Calculate Signature
        const kDate = this.hmac(this.sk, dateStamp);
        const kRegion = this.hmac(kDate, this.region);
        const kService = this.hmac(kRegion, this.service);
        const kSigning = this.hmac(kService, 'request');
        const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

        const authorization = `${algorithm} Credential=${this.ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        return {
            authorization,
            'x-date': amzDate,
            host: this.host,
            'content-type': 'application/json'
        };
    }
}

module.exports = Signer;
