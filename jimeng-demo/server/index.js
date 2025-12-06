const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const Signer = require('./signer');

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// Configuration
// We expect JIMENG_ACCESS_KEY and JIMENG_SECRET_KEY
// Use JIMENG_API_KEY as fallback for AK if SK not present? No, standard is pair.
const AK = process.env.JIMENG_ACCESS_KEY || process.env.JIMENG_AK;
const SK = process.env.JIMENG_SECRET_KEY || process.env.JIMENG_SK;

if (!AK || !SK) {
    console.warn("WARNING: JIMENG_ACCESS_KEY or JIMENG_SECRET_KEY not found in .env");
    console.warn("Please add them to /Users/jason/Dev/crypto-projects/API-test/.env");
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

        const body = {
            req_key: 'jimeng_t2i_v40', // Fixed for Model 4.0
            ...req.body 
        };
        // req.body should contain: prompt, image_urls (optional)

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
        console.error("API Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ 
            error: "Failed to submit task", 
            details: error.response ? error.response.data : error.message 
        });
    }
});

app.get('/api/status/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        const action = 'GetCVTaskResult';
        const version = '2022-08-31'; // Assuming same version or standard
        const query = {
            Action: action,
            Version: version
        };
        
        const body = {
            task_id: taskId
        };

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
