const { getDb } = require('./_db');
const { sendNotification } = require('./_email');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { name, email } = req.body || {};

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required.' });
      return;
    }

    const sql = getDb();

    await sql`
      CREATE TABLE IF NOT EXISTS consents (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      INSERT INTO consents (name, email)
      VALUES (${name}, ${email})
    `;

    await sendNotification({
      subject: `New informed consent signed by ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p>Consent was signed via the MindMed website informed consent form.</p>
      `,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Consent error:', err);
    res.status(500).json({
      error: 'Something went wrong. Please try again.',
    });
  }
};
