const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Middleware
app.use(cors()); // Cho phép tất cả Frontend gọi vào API
app.use(express.json());

// API Endpoint tạo link
app.post('/api/create-link', async (req, res) => {
    try {
        let { url } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, message: 'Thiếu URL gốc' });
        }

        // Tự động thêm https:// nếu thiếu
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        // Lấy API Key từ biến môi trường (hoặc điền trực tiếp nếu chạy nội bộ)
        const apiToken = process.env.LINK4M_API_TOKEN || '6a4f55d76ae7ad25c375ce6e';
        const targetApi = `https://link4m.co/api-shorten?api=${encodeURIComponent(apiToken)}&url=${encodeURIComponent(url)}`;

        // Gọi API Link4M từ Node.js với User-Agent giả lập trình duyệt
        const response = await axios.get(targetApi, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 10000 // Giới hạn 10s
        });

        const data = response.data;
        const shortUrl = data.shortenedUrl || data.url || data.shortedUrl;

        if (data.status === 'success' || shortUrl) {
            return res.json({ 
                success: true, 
                shortUrl: shortUrl 
            });
        } else {
            return res.status(400).json({
                success: false,
                message: data.message || 'API Link4M từ chối tạo link'
            });
        }

    } catch (error) {
        console.error('Lỗi Backend:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ Node.js: ' + (error.response?.data?.message || error.message)
        });
    }
});

// Endpoint kiểm tra máy chủ hoạt động
app.get('/', (req, res) => {
    res.send('Node.js Backend đang hoạt động!');
});

app.listen(PORT, () => {
    console.log(`Server Node.js đang chạy tại cổng ${PORT}`);
});
              
