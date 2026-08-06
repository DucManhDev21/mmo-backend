import { db } from './init-firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Thiếu Token truy cập!' });

  try {
    const sessionRef = db.collection('sessions').doc(token);
    const doc = await sessionRef.get();

    if (!doc.exists) return res.status(400).json({ error: 'Token không tồn tại!' });
    const data = doc.data();

    if (data.used) return res.status(400).json({ error: 'Link này đã lấy mã rồi, không thể lấy lại!' });
    if (Date.now() > data.expiresAt) return res.status(400).json({ error: 'Link đã hết hạn (quá 10 phút)!' });

    const newCode = "CODE-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    await db.runTransaction(async (transaction) => {
      transaction.update(sessionRef, { used: true });
      transaction.set(db.collection('codes').doc(newCode), {
        isUsed: false,
        createdAt: Date.now(),
      });
    });

    return res.status(200).json({ code: newCode });
  } catch (err) {
    return res.status(500).json({ error: 'Lỗi xử lý tạo mã phía Server' });
  }
}
