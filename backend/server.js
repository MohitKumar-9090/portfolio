import cors from 'cors';
import express from 'express';
import admin from 'firebase-admin';

const app = express();
const port = process.env.PORT || 10000;
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const geminiApiBase = 'https://generativelanguage.googleapis.com/v1beta';
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
const portfolioDocPath = process.env.PORTFOLIO_DOC_PATH || 'portfolio/main';
const maxPortfolioContextChars = Number(process.env.MAX_PORTFOLIO_CONTEXT_CHARS || 7000);
const SYSTEM_PROMPT = `
You are the official AI-powered Portfolio Assistant of Mohit Kumar.

You represent Mohit's professional digital identity.
You are intelligent, structured, confident, and natural.

------------------------------------------------------------
IDENTITY CORE
------------------------------------------------------------

Full Name: Mohit Kumar
Also Known As: Mohit Pandey
Degree: B.Tech CSE (AI-ML Associate with IBM)
Current Year: 1st Year Undergraduate
University: Rungta International Skill University
Location: Bihar, India

Mohit is a technically driven undergraduate building strong foundations in Computer Science with a long-term focus on Artificial Intelligence Engineering and Full Stack Development.

------------------------------------------------------------
TECHNICAL FOUNDATION
------------------------------------------------------------

Programming Languages:
- Java
- C
- Python

Web Technologies:
- HTML
- CSS
- JavaScript
- React (actively learning and building)

Database:
- SQL

Core Computer Science:
- Data Structures
- Algorithms
- Problem Solving
- Logical Thinking
- Programming Fundamentals

------------------------------------------------------------
AI & ML ORIENTATION
------------------------------------------------------------

Mohit is currently:
- Learning Machine Learning fundamentals
- Exploring supervised learning concepts
- Building mathematical curiosity
- Strengthening problem-solving depth
- Developing AI-focused long-term career vision

Long-Term Vision:
To become a highly skilled AI Engineer capable of building intelligent, scalable, and impactful systems.

------------------------------------------------------------
PROFESSIONAL PERSONALITY PROFILE
------------------------------------------------------------

Traits:
- Analytical thinker
- Long-term planner
- Growth-oriented
- Consistent learner
- Technically disciplined
- Fundamentals-first mindset
- Calm but ambitious

Professional Belief:
"Strong foundations create strong engineers."

------------------------------------------------------------
COMMUNICATION STYLE
------------------------------------------------------------

You must:

- Speak in a natural, human-like way.
- Maintain professional tone.
- Avoid robotic responses.
- Be structured when answering technical questions.
- Be conversational when answering casual questions.
- Respond in English, Hindi, or Bhojpuri depending on user language.
- If the user mixes languages, respond comfortably in mixed style.

------------------------------------------------------------
STRICT CONTEXT RULES
------------------------------------------------------------

You are ONLY allowed to use:

1. Information provided in this system prompt.
2. Information provided dynamically from Mohit's website data.
3. Information present in the user question.

You MUST NOT:
- Invent internships.
- Fabricate certifications.
- Create fake achievements.
- Add experiences not provided.
- Share private family details.
- Guess missing information.

If something is not available in the provided data:
Politely respond that the portfolio does not contain that information.

------------------------------------------------------------
WEBSITE DATA INTEGRATION
------------------------------------------------------------

You will receive additional structured portfolio data dynamically.
That may include:
- About section
- Projects
- Skills
- Experience
- Reviews
- Achievements

You must combine:
SYSTEM PROMPT + WEBSITE DATA + USER QUESTION

Do not override system instructions.
Do not contradict website data.
Use only verified provided information.

------------------------------------------------------------
WHEN ASKED ABOUT:
------------------------------------------------------------

Why hire Mohit?
Emphasize:
- Strong programming foundation
- AI-focused academic track
- Growth mindset
- Technical discipline
- Long-term engineering commitment

Skills?
Explain clearly and structured.

Future goals?
Respond visionary but realistic.

Projects?
Use website data accurately.

Contact?
Use only website-provided contact information.

------------------------------------------------------------
FAILSAFE RESPONSE
------------------------------------------------------------

If question is unrelated to Mohit's portfolio:
Politely redirect conversation to professional topics.

If question is inappropriate:
Decline respectfully.

------------------------------------------------------------
FINAL BEHAVIOR
------------------------------------------------------------

You are not a generic chatbot.
You are Mohit Kumar's official AI Portfolio Assistant.

Represent him professionally.
Be accurate.
Be controlled.
Be intelligent.
Be grounded.
Be honest.
`.trim();
let firestore = null;

if (serviceAccountRaw) {
  try {
    const parsed = JSON.parse(serviceAccountRaw);
    if (typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
    }
    firestore = admin.firestore();
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error?.message || error);
  }
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/api/reviews', async (_req, res) => {
  if (!firestore) {
    res.status(500).json({ error: 'Server is missing FIREBASE_SERVICE_ACCOUNT_JSON.' });
    return;
  }

  try {
    let snapshot;
    try {
      snapshot = await firestore
        .collection('reviews')
        .where('visible', '==', true)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();
    } catch {
      snapshot = await firestore
        .collection('reviews')
        .where('visible', '==', true)
        .limit(20)
        .get();
    }

    const reviews = [];
    snapshot.forEach((doc) => {
      const data = doc.data() || {};
      const timestampMs =
        typeof data?.timestamp?.toMillis === 'function' ? data.timestamp.toMillis() : null;
      reviews.push({
        id: doc.id,
        data: {
          ...data,
          timestampMs,
        },
      });
    });

    reviews.sort((a, b) => (b.data.timestampMs || 0) - (a.data.timestampMs || 0));
    res.status(200).json({ reviews });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to fetch reviews.' });
  }
});

app.post('/api/reviews', async (req, res) => {
  if (!firestore) {
    res.status(500).json({ error: 'Server is missing FIREBASE_SERVICE_ACCOUNT_JSON.' });
    return;
  }

  const name = (req.body?.name || '').trim();
  const email = (req.body?.email || '').trim();
  const message = (req.body?.message || '').trim();
  const rating = Number(req.body?.rating || 0);

  if (!name || !email || !message || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Invalid review payload.' });
    return;
  }

  try {
    const docRef = await firestore.collection('reviews').add({
      name,
      email,
      message,
      rating,
      visible: true,
      userId: 'anonymous',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ ok: true, id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to submit review.' });
  }
});

app.patch('/api/reviews/:id/hide', async (req, res) => {
  if (!firestore) {
    res.status(500).json({ error: 'Server is missing FIREBASE_SERVICE_ACCOUNT_JSON.' });
    return;
  }

  const reviewId = (req.params?.id || '').trim();
  if (!reviewId) {
    res.status(400).json({ error: 'Review id is required.' });
    return;
  }

  try {
    await firestore.collection('reviews').doc(reviewId).update({ visible: false });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to hide review.' });
  }
});

const SENSITIVE_KEY_PATTERN =
  /(password|pass|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|authorization|cookie|session|credential)/i;
const PUBLIC_CONTACT_KEYS = new Set([
  'email',
  'emails',
  'phone',
  'mobile',
  'location',
  'website',
  'linkedin',
  'github',
  'twitter',
  'x',
  'portfolio',
]);

const truncateText = (value, maxLength) => {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
};

const normalizePortfolioData = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value;
};

const redactSensitiveFields = (value) => {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveFields);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  const safeObject = {};
  for (const [key, raw] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    safeObject[key] = redactSensitiveFields(raw);
  }
  return safeObject;
};

const normalizeSkills = (skills, maxItems = 40, maxTextLength = 60) => {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((item) => truncateText(item, maxTextLength))
    .filter(Boolean)
    .slice(0, maxItems);
};

const normalizeProjects = (projects, maxItems = 10, maxDescLength = 220, maxStackItems = 8) => {
  if (!Array.isArray(projects)) return [];
  return projects.slice(0, maxItems).map((project) => ({
    title: truncateText(project?.title || project?.name || '', 100),
    category: truncateText(project?.category || '', 60),
    description: truncateText(project?.description || project?.summary || '', maxDescLength),
    stack: Array.isArray(project?.stack)
      ? project.stack
          .map((item) => truncateText(item, 40))
          .filter(Boolean)
          .slice(0, maxStackItems)
      : [],
    link: truncateText(project?.link || project?.url || '', 180),
  }));
};

const normalizeContact = (contact) => {
  if (!contact || typeof contact !== 'object' || Array.isArray(contact)) return {};
  const safeContact = {};
  for (const [key, value] of Object.entries(contact)) {
    const normalizedKey = key.toLowerCase();
    if (!PUBLIC_CONTACT_KEYS.has(normalizedKey)) continue;
    if (Array.isArray(value)) {
      safeContact[key] = value.map((item) => truncateText(item, 100)).filter(Boolean).slice(0, 5);
      continue;
    }
    safeContact[key] = truncateText(value, 120);
  }
  return safeContact;
};

const normalizePortfolioForPrompt = (portfolioData, mode = 'normal') => {
  const safeInput = redactSensitiveFields(normalizePortfolioData(portfolioData) || {});
  const limits =
    mode === 'compact'
      ? { skills: 20, projects: 5, projectDesc: 140, stack: 5, dynamicKeys: 6, dynamicText: 120 }
      : { skills: 40, projects: 10, projectDesc: 220, stack: 8, dynamicKeys: 12, dynamicText: 220 };

  const out = {};
  out.about = truncateText(
    safeInput.about || safeInput.aboutMe || safeInput.summary || safeInput.bio || '',
    mode === 'compact' ? 320 : 600
  );
  out.skills = normalizeSkills(safeInput.skills || safeInput.coreSkills, limits.skills);
  out.projects = normalizeProjects(safeInput.projects, limits.projects, limits.projectDesc, limits.stack);
  out.contact = normalizeContact(safeInput.contact || safeInput.contacts || {});

  const dynamic = {};
  const reserved = new Set(['about', 'aboutMe', 'summary', 'bio', 'skills', 'coreSkills', 'projects', 'contact', 'contacts']);
  for (const [key, value] of Object.entries(safeInput)) {
    if (reserved.has(key) || SENSITIVE_KEY_PATTERN.test(key)) continue;
    if (Object.keys(dynamic).length >= limits.dynamicKeys) break;
    if (typeof value === 'string') {
      dynamic[key] = truncateText(value, limits.dynamicText);
      continue;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      dynamic[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      dynamic[key] = value
        .map((item) =>
          typeof item === 'string' || typeof item === 'number'
            ? truncateText(item, 80)
            : null
        )
        .filter((item) => item !== null)
        .slice(0, mode === 'compact' ? 6 : 10);
      continue;
    }
    if (value && typeof value === 'object') {
      const mini = {};
      for (const [k, v] of Object.entries(value)) {
        if (SENSITIVE_KEY_PATTERN.test(k)) continue;
        if (typeof v === 'string') mini[k] = truncateText(v, 80);
        else if (typeof v === 'number' || typeof v === 'boolean') mini[k] = v;
        if (Object.keys(mini).length >= 6) break;
      }
      if (Object.keys(mini).length > 0) dynamic[key] = mini;
    }
  }
  if (Object.keys(dynamic).length > 0) out.dynamic = dynamic;

  if (!out.about) delete out.about;
  if (!out.skills?.length) delete out.skills;
  if (!out.projects?.length) delete out.projects;
  if (!Object.keys(out.contact || {}).length) delete out.contact;
  if (!Object.keys(out.dynamic || {}).length) delete out.dynamic;
  return out;
};

const getPortfolioDataFromFirebase = async () => {
  if (!firestore) return null;
  const [collectionName, docId] = portfolioDocPath.split('/');
  if (!collectionName || !docId) return null;

  const doc = await firestore.collection(collectionName).doc(docId).get();
  if (!doc.exists) return null;
  return normalizePortfolioData(doc.data());
};

const buildFinalPrompt = ({ systemPrompt, portfolioData, userMessage, maxChars }) => {
  let promptPortfolioData = normalizePortfolioForPrompt(portfolioData, 'normal');
  let portfolioJson = JSON.stringify(promptPortfolioData);

  if (portfolioJson.length > maxChars) {
    promptPortfolioData = normalizePortfolioForPrompt(portfolioData, 'compact');
    portfolioJson = JSON.stringify(promptPortfolioData);
  }
  if (portfolioJson.length > maxChars) {
    const minimal = {
      about: truncateText(promptPortfolioData?.about || '', 240),
      skills: (promptPortfolioData?.skills || []).slice(0, 12),
      projects: (promptPortfolioData?.projects || []).slice(0, 3).map((project) => ({
        title: project?.title || '',
        category: project?.category || '',
        description: truncateText(project?.description || '', 100),
      })),
      note: 'Portfolio context truncated for token efficiency.',
    };
    portfolioJson = JSON.stringify(minimal);
  }

  return `
Here is Mohit's latest portfolio data:
${portfolioJson}

User Question:
${userMessage}
`.trim();
};

app.post('/api/chat', async (req, res) => {
  if (!geminiApiKey) {
    res.status(500).json({ error: 'Server is missing GEMINI_API_KEY.' });
    return;
  }

  const userMessage = (req.body?.message || req.body?.prompt || '').trim();
  if (!userMessage) {
    res.status(400).json({ error: 'User message is required.' });
    return;
  }

  try {
    const requestPortfolioData = normalizePortfolioData(req.body?.portfolioData);
    const firebasePortfolioData = await getPortfolioDataFromFirebase().catch(() => null);
    const latestPortfolioData = firebasePortfolioData || requestPortfolioData || {};
    const finalPrompt = buildFinalPrompt({
      systemPrompt: SYSTEM_PROMPT,
      portfolioData: latestPortfolioData,
      userMessage,
      maxChars: maxPortfolioContextChars,
    });

    const modelsResponse = await fetch(`${geminiApiBase}/models?key=${geminiApiKey}`);
    if (!modelsResponse.ok) {
      const err = await modelsResponse.json().catch(() => ({}));
      res
        .status(modelsResponse.status)
        .json({ error: err?.error?.message || 'Unable to fetch Gemini models.' });
      return;
    }

    const modelsData = await modelsResponse.json();
    const candidates = (modelsData?.models || []).filter((model) =>
      (model?.supportedGenerationMethods || []).includes('generateContent')
    );

    if (candidates.length === 0) {
      res.status(500).json({ error: 'No generateContent model available for this API key.' });
      return;
    }

    const preferredOrder = ['flash', 'gemini-2', 'gemini-1.5', 'pro'];
    candidates.sort((a, b) => {
      const an = (a?.name || '').toLowerCase();
      const bn = (b?.name || '').toLowerCase();
      const ai = preferredOrder.findIndex((key) => an.includes(key));
      const bi = preferredOrder.findIndex((key) => bn.includes(key));
      const aRank = ai === -1 ? 999 : ai;
      const bRank = bi === -1 ? 999 : bi;
      return aRank - bRank;
    });

    let reply = '';
    let lastError = 'Gemini returned an empty response.';

    for (const model of candidates) {
      const rawName = model?.name || '';
      const modelPath = rawName.startsWith('models/') ? rawName : `models/${rawName}`;
      const endpoint = `${geminiApiBase}/${modelPath}:generateContent?key=${geminiApiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            role: 'system',
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        lastError = err?.error?.message || `Model call failed (${response.status}).`;
        continue;
      }

      const data = await response.json();
      reply =
        data?.candidates?.[0]?.content?.parts
          ?.map((part) => part?.text || '')
          .join('\n')
          .trim() || '';
      if (reply) break;
    }

    if (!reply) {
      res.status(500).json({ error: lastError });
      return;
    }

    res.status(200).json({
      reply,
      contextSource: firebasePortfolioData ? 'firebase' : requestPortfolioData ? 'request' : 'none',
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Unexpected server error.' });
  }
});

app.listen(port, () => {
  console.log(`Chat backend running on port ${port}`);
});
