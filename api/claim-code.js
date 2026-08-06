import { db } from './init-firebase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
  }

  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({ error: 'Lỗi: Link thiếu tham số xác thực (Token)!' });
    }

    const sessionRef = db.collection('sessions').doc(token);
    const doc = await sessionRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Lỗi: Token không tồn tại hoặc link giả mạo!' });
    }

    const sessionData = doc.data();

    if (sessionData.used) {
      return res.status(400).json({ error: 'Lỗi: Link này đã được sử dụng để lấy mã rồi!' });
    }

    if (sessionData.expiresAt && Date.now() > sessionData.expiresAt) {
      return res.status(400).json({ error: 'Lỗi: Link đã hết hạn (quá 10 phút)!' });
    }

    // 1. Tạo mã thưởng ngẫu nhiên
    const rewardCode = 'TDM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const now = Date.now();

    // 2. LƯU MÃ VÀO COLLECTION 'codes' ĐỂ verify-code.js KIỂM TRA ĐƯỢC
    await db.collection('codes').doc(rewardCode).set({
      isUsed: false,
      createdAt: now,
      expiresAt: now + (24 * 60 * 60 * 1000), // Hết hạn sau 24 giờ
      token: token
    });

    // 3. Đánh dấu token trong collection 'sessions' đã được nhận mã
    await sessionRef.update({
      used: true,
      claimedAt: now,
      rewardCode: rewardCode
    });

    return res.status(200).json({ success: true, code: rewardCode });

  } catch (err) {
    console.error('Lỗi claim-code:', err);
    return res.status(500).json({ error: 'Lỗi hệ thống phía Server', message: err.message });
  }
}
