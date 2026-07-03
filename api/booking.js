const { getDb } = require('./_db');
const { sendNotification } = require('./_email');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { name, email, phone, sessionType, message } = req.body || {};

    if (!name || !email || !phone) {
      res.status(400).json({ error: 'Name, email, and phone are required.' });
      return;
    }

    const sql = getDb();

    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        session_type TEXT,
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      INSERT INTO bookings (name, email, phone, session_type, message)
      VALUES (${name}, ${email}, ${phone}, ${sessionType || 'Individual Session'}, ${message || ''})
    `;

    await sendNotification({
      subject: `New booking request from ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Session type:</strong> ${sessionType || 'Individual Session'}</p>
        <p><strong>Message:</strong> ${message || '-'}</p>
      `,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({
      error: 'Something went wrong. Please try again or email bookings@mindmed.com.ng.',
    });
  }
};
