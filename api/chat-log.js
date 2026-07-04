const { getDb } = require('./_db');
const { sendNotification } = require('./_email');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { sessionId, userMessage, botResponse, isCrisis } = req.body || {};

    if (!sessionId || !userMessage) {
      res.status(400).json({ error: 'sessionId and userMessage are required.' });
      return;
    }

    const sql = getDb();

    await sql`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_message TEXT NOT NULL,
        bot_response TEXT,
        is_crisis BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      INSERT INTO chat_logs (session_id, user_message, bot_response, is_crisis)
      VALUES (${sessionId}, ${userMessage}, ${botResponse || ''}, ${!!isCrisis})
    `;

    if (isCrisis) {
      await sendNotification({
        subject: `URGENT: Crisis message flagged on MindMed Support Assistant`,
        html: `
          <p><strong>A visitor's message was flagged as a possible crisis.</strong></p>
          <p><strong>Session:</strong> ${sessionId}</p>
          <p><strong>Message:</strong> ${userMessage}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p>The visitor was shown emergency helpline information (112 / 081-6913-7108) automatically. Please follow up if there's any way to identify and reach them.</p>
        `,
      });
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Chat log error:', err);
    res.status(200).json({ success: false });
  }
};
