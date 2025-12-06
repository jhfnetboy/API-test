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
    try {
        const action = 'CVSync2AsyncSubmitTask';
        const version = '2022-08-31';
        
        const query = {
            Action: action,
            Version: version
        };

        const bodyObj = {
            req_key: 'jimeng_t2i_v40', 
            ...req.body 
        };
        
        const bodyString = JSON.stringify(bodyObj);

        // Debug: Log payload size (Base64 can be huge)
        console.log(`Payload size: ${bodyString.length} chars`);

        const authData = signer.sign('POST', '/', query, {}, bodyObj); 

        console.log("Submitting to Volcengine:", {
             url: BASE_URL,
             params: query,
             // Don't log full body if huge
             bodyKeys: Object.keys(bodyObj)
        });

        const response = await axios.post(BASE_URL, bodyObj, {
            params: query,
            headers: {
                'Authorization': authData.authorization,
                'Content-Type': 'application/json',
                'Host': authData.host,
                'X-Date': authData['x-date']
            }
        });

        res.json(response.data);

    } catch (error) {
        const errorDetails = error.response ? error.response.data : error.message;
        console.error("API Error Details:", JSON.stringify(errorDetails, null, 2));
        res.status(500).json({ 
            error: "Failed to submit task", 
            details: errorDetails
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
            Action: 'GetCVTaskResult',
            Version: '2022-08-31'
        };
        
        const body = { task_id: taskId };

        const authData = signer.sign('POST', '/', query, {}, body);

        const response = await axios.post(BASE_URL, body, {
             params: query,
             headers: {
                 'Authorization': authData.authorization,
                 'Content-Type': 'application/json',
                 'Host': authData.host,
                 'X-Date': authData['x-date']
             }
         });

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
