const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const Signer = require('./signer');
const crypto = require('crypto-js');

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const PORT = 3000;

const AK = process.env.JIMENG_ACCESS_KEY || process.env.JIMENG_AK;
const SK = process.env.JIMENG_SECRET_KEY || process.env.JIMENG_SK;

if (!AK || !SK) {
    console.warn("WARNING: JIMENG_ACCESS_KEY or JIMENG_SECRET_KEY not found in .env");
}

const signer = new Signer({
    ak: AK,
    sk: SK,
    service: 'cv',
    region: 'cn-north-1',
    host: 'visual.volcengineapi.com'
});

const BASE_URL = 'https://visual.volcengineapi.com';

app.post('/api/generate', async (req, res) => {
    const traceId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${traceId}] 📥 Incoming /api/generate request`);
    
    try {
        const action = 'CVSync2AsyncSubmitTask';
        const version = '2022-08-31';
        
        // Query params
        const query = {
            Action: action,
            Version: version
        };

        // 1. Log what we received from Frontend
        console.log(`[${traceId}] Frontend Body:`, JSON.stringify(req.body).substring(0, 200) + "...");

        const bodyObj = {
            req_key: 'jimeng_t2i_v40', 
            ...req.body 
        };
        
        // 2. Serialize and Log the exact string to be signed/sent
        const bodyString = JSON.stringify(bodyObj);
        console.log(`[${traceId}] 🔒 String to Sign (${bodyString.length} chars):`, bodyString.substring(0, 100) + "...");

        // 3. Sign
        const authData = signer.sign('POST', '/', query, bodyString); 
        console.log(`[${traceId}] 🔑 Signature generated. Credential: ${authData.authorization.split(',')[0]}`);

        // 4. Send to Volcengine
        console.log(`[${traceId}] 🚀 Sending to Volcengine...`);
        const response = await axios({
            method: 'post',
            url: BASE_URL,
            params: query,
            data: bodyString, // Send the exact string
            headers: {
                'Authorization': authData.authorization,
                'Content-Type': 'application/json',
                'Host': authData.host,
                'X-Date': authData['x-date']
            },
            validateStatus: () => true // Resolve promise for all status codes so we can log them
        });

        // 5. Log Response
        console.log(`[${traceId}] ⬅️ Volcengine Response: Status ${response.status}`);
        if (response.status !== 200) {
            console.error(`[${traceId}] ❌ Error Response Body:`, JSON.stringify(response.data, null, 2));
            console.error(`[${traceId}] ❌ Error RequestId:`, response.headers['x-top-request-id'] || response.data?.ResponseMetadata?.RequestId || 'N/A');
        }

        // Return to frontend
        if (response.status === 200) {
            res.json(response.data);
        } else {
            // Forward the specific error from Volcengine to frontend for display
            res.status(response.status).json(response.data);
        }

    } catch (error) {
        console.error(`[${traceId}] 💥 System Error:`, error.message);
        if (error.response) {
            console.error(`[${traceId}] External API Error Data:`, JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).json({ 
            error: "Internal Server Error", 
            traceId: traceId,
            details: error.message 
        });
    }
});

// Handle generic GET on generate to warn user
app.get('/api/generate', (req, res) => {
    res.status(405).send("Method Not Allowed. Please use POST.");
});

app.get('/api/status/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const query = {
            Action: 'CVSync2AsyncGetResult',
            Version: '2022-08-31'
        };
        
        const bodyObj = { 
            req_key: 'jimeng_t2i_v40', 
            task_id: taskId 
        };
        const bodyString = JSON.stringify(bodyObj);

        // Sign using the exact string
        const authData = signer.sign('POST', '/', query, bodyString);

        const response = await axios({
            method: 'post', 
            url: BASE_URL,
            params: query,
            data: bodyString,
            headers: {
                'Authorization': authData.authorization,
                'Content-Type': 'application/json',
                'Host': authData.host,
                'X-Date': authData['x-date']
            }
        });

        console.log(`[Status Check] TaskID: ${taskId} | Code: ${response.status}`);
        console.log(`[Status Payload]`, JSON.stringify(response.data).substring(0, 500));

        res.json(response.data);

    } catch (error) {
        console.error("Status Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: "Failed to get task status", 
            details: error.response ? error.response.data : error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Region: cn-north-1, Service: cv`);
});
