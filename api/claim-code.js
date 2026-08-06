import admin from 'firebase-admin';

// Khởi tạo Firebase Admin SDK với Service Account (Ẩn trên Server)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Phương thức không được hỗ trợ!' });
  }

  const { token, uid } = req.body;

  if (!token || !uid) {
    return res.status(400).json({ error: 'Thiếu thông tin token hoặc uid hợp lệ!' });
  }

  try {
    const missionRef = db.collection('missions').doc(token);
    const missionSnap = await missionRef.get();

    if (!missionSnap.exists) {
      return res.status(404).json({ error: 'Link nhiệm vụ đã hết hạn hoặc không tồn tại!' });
    }

    const missionData = missionSnap.data();

    if (missionData.uid !== uid) {
      return res.status(403).json({ error: 'Bạn không phải người sở hữu nhiệm vụ này!' });
    }

    if (missionData.status !== 'pending') {
      return res.status(400).json({ error: 'Nhiệm vụ này đã được hoàn thành trước đó!' });
    }

    // Sinh mã ngẫu nhiên trên máy chủ
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newCode = 'TDM-';
    for (let i = 0; i < 6; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Cập nhật trạng thái nhiệm vụ và lưu mã mới vào Firestore
    await missionRef.update({ status: 'completed' });
    await db.collection('codes').add({
      code: newCode,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedFor: uid,
    });

    return res.status(200).json({ success: true, code: newCode });

  } catch (error) {
    console.error('Lỗi xử lý máy chủ:', error);
    return res.status(500).json({ error: 'Lỗi xác thực hệ thống máy chủ!' });
  }
}
