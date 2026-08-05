const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/api/create-link', async (req, res) => {
    try {
        let { url } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, message: 'Thiếu URL gốc' });
        }

        // Tự động bổ sung https:// nếu thiếu
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        const apiToken = process.env.LINK4M_API_TOKEN || '6a4f55d76ae7ad25c375ce6e';

        // Danh sách các đường dẫn API có thể có của Link4M
        const apiEndpoints = [
            `https://link4m.co/api-shorten?api=${encodeURIComponent(apiToken)}&url=${encodeURIComponent(url)}`,
            `https://link4m.co/api?api=${encodeURIComponent(apiToken)}&url=${encodeURIComponent(url)}`
        ];

        let responseData = null;
        let lastError = null;

        // Thử lần lượt các Endpoint
        for (const targetApi of apiEndpoints) {
            try {
                const response = await axios.get(targetApi, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*'
                    },
                    timeout: 10000
                });

                if (response.data) {
                    responseData = response.data;
                    break; // Thành công thì thoát vòng lặp
                }
            } catch (err) {
                lastError = err;
            }
        }

        if (!responseData) {
            throw lastError || new Error('Không thể kết nối tới Link4M');
        }

        const shortUrl = responseData.shortenedUrl || responseData.url || responseData.shortedUrl;

        if (responseData.status === 'success' || shortUrl) {
            return res.json({ success: true, shortUrl: shortUrl });
        } else {
            return res.status(400).json({
                success: false,
                message: responseData.message || 'API Link4M từ chối tạo link'
            });
        }

    } catch (error) {
        console.error('Lỗi chi tiết từ Link4M:', error.response?.data || error.message);

        const statusCode = error.response?.status || 500;
        const errorMsg = error.response?.data?.message || error.message;

        return res.status(statusCode).json({
            success: false,
            message: `Lỗi kết nối Link4M (${statusCode}): ${errorMsg}`
        });
    }
});

app.get('/', (req, res) => {
    res.send('Backend Node.js đang hoạt động!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
            
