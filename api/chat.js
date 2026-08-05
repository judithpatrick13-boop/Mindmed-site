const { getDb } = require('./_db');
const { sendNotification } = require('./_email');

const CRISIS_PATTERNS = [
  /suicid/i, /kill(ing)? myself/i, /want(ing)? to die/i, /wanna die/i,
  /end(ing)? my life/i, /take my (own )?life/i, /no reason to live/i,
  /nothing to live for/i, /better off dead/i, /can'?t go on/i,
  /can'?t take (it|this) anymore/i, /hurt(ing)? myself/i, /self.?harm/i,
  /cutt?ing myself/i, /cut myself/i, /overdose/i, /don'?t want to (be alive|live|exist)/i,
  /life (is|isn'?t) not worth/i, /life isn'?t worth/i
];

const CRISIS_REPLY = "I hear you, and you deserve support right now. Please reach out immediately: call emergency services on 112, or Mentally Aware Nigeria Initiative (MANI) on 0809 111 6264 or 0811 168 0686. If you're in immediate danger, please go to the nearest hospital. I've flagged this conversation so a MindMed team member can follow up too. You don't have to go through this alone.";

const FALLBACK_REPLY = "I'm having trouble responding right now, but I don't want to leave you without help. You can book a session directly on this page, or WhatsApp us for a quicker reply.";

// ---------------------------------------------------------------------
// SITE FACTS — Fade only knows what's written here. Whenever you change
// a price, add a product, or update a policy on the live site, update
// the matching line below too. Nothing here updates itself automatically.
// Last reviewed: update this comment's date whenever you edit below.
// Last reviewed: 2026-08-04
// ---------------------------------------------------------------------
const SITE_FACTS = `
SESSIONS (booked via the "Book a Session" form or WhatsApp, all online via Doxy.me):
- Individual session: ₦7,000
- Group session: ₦4,000 per person, groups of 4 to 7 people, one shared 50-minute session
- Session Package: ₦32,500 for 5 individual sessions, valid for 3 months

SELF-HELP TOOLKITS (sold in the Store, delivered by WhatsApp or email after payment, not therapy sessions, self-guided PDF guides):
- Anxiety Toolkit: ₦3,000
- Depression Toolkit: ₦3,000
- Caregiver Support Toolkit: ₦3,000
- Complete Toolkit (Anxiety + Depression combined): ₦5,000
- Workplace Wellness Toolkit (for teams/organizations): price varies by team size, direct them to WhatsApp to discuss
- How to buy: message us on WhatsApp from the Store page, we send payment details there, then deliver the PDF once payment is confirmed

FREE SELF-ASSESSMENTS (after signing informed consent, on the homepage):
- Anxiety + Depression combined (GAD-7 / PHQ-9)
- PTSD (PCL-5)
- Adult ADHD (ASRS-v1.1)
- Stress & Burnout Check
- Social Anxiety Check
All are screening tools only, not diagnoses.

COMPLIANCE & DATA:
- MindMed complies with the Nigeria Data Protection Act (NDPA) 2023, under the oversight of the Nigeria Data Protection Commission (NDPC).
- Data is stored in an encrypted database and never sold or shared with third parties.

CONTACT:
- Email: support@mindmed.com.ng
- WhatsApp: available via the button on the site
`;

const SYSTEM_PROMPT = `You are "Fade", the friendly support assistant on the MindMed website, a mental health education and therapist-booking platform in Nigeria.

RULES (follow strictly):
- You are not a doctor or therapist. Never diagnose, never suggest medication, never claim to treat anyone.
- Keep replies short: 2-4 sentences, warm, plain English, no medical jargon.
- Answer questions about MindMed ONLY using the facts listed below. Never invent prices, staff, features, or claims not listed here.
- If someone asks about something not covered in the facts below (a product, price, or policy you don't see listed), say you're not sure and suggest emailing support@mindmed.com.ng rather than guessing.
- For general mental health questions (coping strategies, what therapy involves, CBT basics, stress, anxiety, etc.), give safe, general, evidence-informed information. Do not give personalized treatment advice.
- Your goal is to help people take the next real step: taking a free self-assessment, booking a session, or browsing the self-help Store, whichever fits what they're asking about. Gently point toward these when relevant, without being pushy.
- If a message expresses hopelessness, self-harm, or crisis language, you will never see it — a separate safety system already intercepts those and this system prompt does not need to handle it.
- If you don't know something, say so honestly and suggest emailing support@mindmed.com.ng.

FACTS ABOUT MINDMED:
${SITE_FACTS}`;

function isCrisis(text) {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}

async function callGemini(userMessage, history) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const contents = (history || []).slice(-6).map((turn) => ({
    role: turn.role === 'bot' ? 'model' : 'user',
    parts: [{ text: turn.text }],
  }));
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { maxOutputTokens: 1220, temperature: 0.4 },
  });

  // Try a couple of model names in case one has been renamed/retired on Google's side
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastError;

  for (const model of modelsToTry) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body,
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error(`Gemini API error (${model}):`, res.status, text);
        lastError = new Error(`Gemini API error ${res.status} on ${model}`);
        continue;
      }

      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) {
        lastError = new Error(`Gemini returned no text on ${model}`);
        continue;
      }
      return reply.trim();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini model attempts failed');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { sessionId, message, history } = req.body || {};
    if (!sessionId || !message) {
      res.status(400).json({ error: 'sessionId and message are required.' });
      return;
    }

    const crisisFlag = isCrisis(message);
    let reply;

    if (crisisFlag) {
      reply = CRISIS_REPLY;
    } else {
      try {
        reply = await callGemini(message, history);
      } catch (err) {
        console.error('Falling back to static reply:', err);
        reply = FALLBACK_REPLY;
      }
    }

    try {
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
        VALUES (${sessionId}, ${message}, ${reply}, ${crisisFlag})
      `;
    } catch (dbErr) {
      console.error('Chat log DB error:', dbErr);
    }

    if (crisisFlag) {
      await sendNotification({
        subject: 'URGENT: Crisis language flagged on MindMed Support Assistant',
        html: `
          <p><strong>A visitor's message was flagged as a possible crisis.</strong></p>
          <p><strong>Session:</strong> ${sessionId}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p>The visitor was shown emergency helpline information (112 / MANI: 0809 111 6264 or 0811 168 0686) automatically.</p>
        `,
      });
    }

    res.status(200).json({ reply, isCrisis: crisisFlag });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ reply: FALLBACK_REPLY, isCrisis: false });
  }
};
