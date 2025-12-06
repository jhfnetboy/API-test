import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

export interface GenerateResponse {
    code: number;
    message: string;
    data: {
        id: string; // Task ID (sometimes task_id in response but mapped?)
        task_id?: string; // Add optional task_id
        status: string;
    };
    request_id: string;
}

export interface TaskResultResponse {
    code: number;
    message: string;
    data: {
        id: string;
        status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
        results?: Array<{
            url: string;
        }>;
        image_urls?: string[]; // Add fallback field
    };
}

export const generateImage = async (prompt: string, imageUrls?: string[]) => {
    const payload: any = {
        prompt,
    };
    if (imageUrls && imageUrls.length > 0) {
        payload.image_urls = imageUrls;
    }

    const response = await axios.post<GenerateResponse>(`${API_BASE}/generate`, payload);
    return response.data;
};

export const getTaskStatus = async (taskId: string) => {
    const response = await axios.get<TaskResultResponse>(`${API_BASE}/status/${taskId}`);
    return response.data;
};
