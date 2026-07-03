async function sendNotification({ subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not set, skipping email notification.');
    return;
  }
  const fromAddress = process.env.NOTIFY_FROM_EMAIL || 'MindMed <notifications@notify.mindmed.com.ng>';
  const toAddress = process.env.NOTIFY_TO_EMAIL || 'support@mindmed.com.ng';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toAddress],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Resend API error:', res.status, text);
    }
  } catch (err) {
    console.error('Failed to send email notification:', err);
  }
}

module.exports = { sendNotification };
