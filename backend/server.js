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
const getTodayKey = () => {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DEVICE_TYPES = ['Mobile', 'Desktop', 'Tablet'];
const TRAFFIC_SOURCES = ['Google Search', 'Direct', 'LinkedIn', 'Instagram', 'Other'];
const LIVE_VISITOR_TTL_MS = 120000;

const baseCountMap = (keys) => keys.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});

const sanitizeDeviceType = (value) => {
  const input = String(value || '').trim();
  return DEVICE_TYPES.includes(input) ? input : 'Desktop';
};

const sanitizeTrafficSource = (value) => {
  const input = String(value || '').trim();
  return TRAFFIC_SOURCES.includes(input) ? input : 'Other';
};

const inMemoryVisitorStats = {
  totalVisitors: 0,
  dailyCounts: {},
  deviceCounts: baseCountMap(DEVICE_TYPES),
  sourceCounts: baseCountMap(TRAFFIC_SOURCES),
  resumeDownloads: 0,
  updatedAt: Date.now(),
};
const inMemoryAnalyticsStats = {
  pageViews: 0,
  byPath: {},
  events: {},
  lastVisitedAt: null,
};
const inMemoryLiveSessions = new Map();
const inMemoryVisitorLogs = [];
const visitorStreamClients = new Set();

const normalizeVisitorLog = (value = {}) => {
  const lat = Number(value.latitude);
  const lng = Number(value.longitude);
  const timestampMs =
    typeof value.visitTimeMs === 'number'
      ? value.visitTimeMs
      : value?.visitTime && typeof value.visitTime.toMillis === 'function'
        ? value.visitTime.toMillis()
        : Date.now();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    id: String(value.id || '').trim() || `visitor_${timestampMs}_${Math.random().toString(36).slice(2, 8)}`,
    city: String(value.city || '').trim() || 'Unknown City',
    country: String(value.country || value.country_name || '').trim() || 'Unknown Country',
    latitude: lat,
    longitude: lng,
    ip: String(value.ip || '').trim(),
    deviceType: sanitizeDeviceType(value.deviceType),
    browser: String(value.browser || '').trim() || 'Unknown Browser',
    visitTimeMs: timestampMs,
  };
};

const emitVisitorStream = (payload) => {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  visitorStreamClients.forEach((clientRes) => {
    clientRes.write(data);
  });
};

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
  const deletePassword = String(req.body?.password || '').trim();
  const expectedDeletePassword = String(process.env.REVIEW_DELETE_PASSWORD || 'pass-85790').trim();

  if (!reviewId) {
    res.status(400).json({ error: 'Review id is required.' });
    return;
  }

  if (!deletePassword || deletePassword !== expectedDeletePassword) {
    res.status(403).json({ error: 'Invalid delete password.' });
    return;
  }

  try {
    await firestore.collection('reviews').doc(reviewId).update({ visible: false });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to hide review.' });
  }
});

const visitorsDocRef = () => (firestore ? firestore.collection('siteStats').doc('visitors') : null);

const getVisitorCount = async () => {
  if (!firestore) {
    const todayKey = getTodayKey();
    return {
      totalVisitors: inMemoryVisitorStats.totalVisitors,
      todayVisitors: Number(inMemoryVisitorStats.dailyCounts[todayKey] || 0),
      deviceCounts: inMemoryVisitorStats.deviceCounts,
      sourceCounts: inMemoryVisitorStats.sourceCounts,
      resumeDownloads: Number(inMemoryVisitorStats.resumeDownloads || 0),
    };
  }

  const doc = await visitorsDocRef().get();
  if (!doc.exists) {
    return {
      totalVisitors: 0,
      todayVisitors: 0,
      deviceCounts: baseCountMap(DEVICE_TYPES),
      sourceCounts: baseCountMap(TRAFFIC_SOURCES),
      resumeDownloads: 0,
    };
  }
  const data = doc.data() || {};
  const todayKey = getTodayKey();
  const dailyCounts = data.dailyCounts && typeof data.dailyCounts === 'object' ? data.dailyCounts : {};
  const deviceCounts = data.deviceCounts && typeof data.deviceCounts === 'object'
    ? { ...baseCountMap(DEVICE_TYPES), ...data.deviceCounts }
    : baseCountMap(DEVICE_TYPES);
  const sourceCounts = data.sourceCounts && typeof data.sourceCounts === 'object'
    ? { ...baseCountMap(TRAFFIC_SOURCES), ...data.sourceCounts }
    : baseCountMap(TRAFFIC_SOURCES);
  return {
    totalVisitors: Number(data.totalVisitors || 0),
    todayVisitors: Number(dailyCounts[todayKey] || 0),
    deviceCounts,
    sourceCounts,
    resumeDownloads: Number(data.resumeDownloads || 0),
  };
};

const incrementVisitorCount = async ({ deviceType = 'Desktop', source = 'Direct' } = {}) => {
  const safeDeviceType = sanitizeDeviceType(deviceType);
  const safeSource = sanitizeTrafficSource(source);

  if (!firestore) {
    const todayKey = getTodayKey();
    inMemoryVisitorStats.totalVisitors += 1;
    inMemoryVisitorStats.dailyCounts[todayKey] =
      Number(inMemoryVisitorStats.dailyCounts[todayKey] || 0) + 1;
    inMemoryVisitorStats.deviceCounts[safeDeviceType] =
      Number(inMemoryVisitorStats.deviceCounts[safeDeviceType] || 0) + 1;
    inMemoryVisitorStats.sourceCounts[safeSource] =
      Number(inMemoryVisitorStats.sourceCounts[safeSource] || 0) + 1;
    inMemoryVisitorStats.updatedAt = Date.now();
    return {
      totalVisitors: inMemoryVisitorStats.totalVisitors,
      todayVisitors: Number(inMemoryVisitorStats.dailyCounts[todayKey] || 0),
      deviceCounts: inMemoryVisitorStats.deviceCounts,
      sourceCounts: inMemoryVisitorStats.sourceCounts,
      resumeDownloads: Number(inMemoryVisitorStats.resumeDownloads || 0),
    };
  }

  const nextStats = await firestore.runTransaction(async (transaction) => {
    const docRef = visitorsDocRef();
    const snapshot = await transaction.get(docRef);
    const current = snapshot.exists ? Number(snapshot.data()?.totalVisitors || 0) : 0;
    const updated = current + 1;
    const todayKey = getTodayKey();
    const prevDailyCounts =
      snapshot.exists && snapshot.data()?.dailyCounts && typeof snapshot.data().dailyCounts === 'object'
        ? snapshot.data().dailyCounts
        : {};
    const dailyCounts = { ...prevDailyCounts, [todayKey]: Number(prevDailyCounts[todayKey] || 0) + 1 };
    const prevDeviceCounts =
      snapshot.exists && snapshot.data()?.deviceCounts && typeof snapshot.data().deviceCounts === 'object'
        ? snapshot.data().deviceCounts
        : baseCountMap(DEVICE_TYPES);
    const prevSourceCounts =
      snapshot.exists && snapshot.data()?.sourceCounts && typeof snapshot.data().sourceCounts === 'object'
        ? snapshot.data().sourceCounts
        : baseCountMap(TRAFFIC_SOURCES);
    const deviceCounts = {
      ...baseCountMap(DEVICE_TYPES),
      ...prevDeviceCounts,
      [safeDeviceType]: Number(prevDeviceCounts[safeDeviceType] || 0) + 1,
    };
    const sourceCounts = {
      ...baseCountMap(TRAFFIC_SOURCES),
      ...prevSourceCounts,
      [safeSource]: Number(prevSourceCounts[safeSource] || 0) + 1,
    };
    const resumeDownloads = Number(snapshot.data()?.resumeDownloads || 0);

    transaction.set(
      docRef,
      {
        totalVisitors: updated,
        dailyCounts,
        deviceCounts,
        sourceCounts,
        resumeDownloads,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return {
      totalVisitors: updated,
      todayVisitors: Number(dailyCounts[todayKey] || 0),
      deviceCounts,
      sourceCounts,
      resumeDownloads,
    };
  });

  return nextStats;
};

app.get('/api/visitors', async (_req, res) => {
  try {
    const stats = await getVisitorCount();
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to fetch visitors.' });
  }
});

app.post('/api/visitors/increment', async (req, res) => {
  try {
    const stats = await incrementVisitorCount({
      deviceType: req.body?.deviceType,
      source: req.body?.source,
    });
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to increment visitors.' });
  }
});

const saveVisitorLog = async (payload = {}) => {
  const normalized = normalizeVisitorLog(payload);
  if (!normalized) {
    throw new Error('Invalid visitor payload.');
  }

  if (!firestore) {
    inMemoryVisitorLogs.unshift(normalized);
    if (inMemoryVisitorLogs.length > 100) {
      inMemoryVisitorLogs.length = 100;
    }
    return normalized;
  }

  const docRef = firestore.collection('visitorLogs').doc();
  const docPayload = {
    city: normalized.city,
    country: normalized.country,
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    ip: normalized.ip,
    deviceType: normalized.deviceType,
    browser: normalized.browser,
    visitTime: admin.firestore.FieldValue.serverTimestamp(),
    visitTimeMs: normalized.visitTimeMs,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await docRef.set(docPayload);

  return { ...normalized, id: docRef.id };
};

const getRecentVisitorLogs = async (limit = 50) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  if (!firestore) {
    return inMemoryVisitorLogs.slice(0, safeLimit);
  }

  const snapshot = await firestore
    .collection('visitorLogs')
    .orderBy('visitTimeMs', 'desc')
    .limit(safeLimit)
    .get()
    .catch(async () => {
      return await firestore
        .collection('visitorLogs')
        .orderBy('createdAt', 'desc')
        .limit(safeLimit)
        .get();
    });

  const rows = [];
  snapshot.forEach((doc) => {
    const data = doc.data() || {};
    rows.push(
      normalizeVisitorLog({
        id: doc.id,
        city: data.city,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        ip: data.ip,
        deviceType: data.deviceType,
        browser: data.browser,
        visitTimeMs:
          typeof data.visitTimeMs === 'number'
            ? data.visitTimeMs
            : data?.visitTime && typeof data.visitTime.toMillis === 'function'
              ? data.visitTime.toMillis()
              : Date.now(),
      })
    );
  });

  return rows.filter(Boolean).sort((a, b) => b.visitTimeMs - a.visitTimeMs);
};

app.post('/api/visitors/log', async (req, res) => {
  try {
    const saved = await saveVisitorLog({
      city: req.body?.city,
      country_name: req.body?.country_name,
      country: req.body?.country,
      latitude: req.body?.latitude,
      longitude: req.body?.longitude,
      ip: req.body?.ip,
      deviceType: req.body?.deviceType,
      browser: req.body?.browser,
      visitTimeMs: req.body?.visitTimeMs,
    });

    emitVisitorStream({ type: 'visitor_logged', visitor: saved });
    res.status(200).json({ ok: true, visitor: saved });
  } catch (error) {
    res.status(400).json({ error: error?.message || 'Failed to store visitor log.' });
  }
});

app.get('/api/visitors/recent', async (req, res) => {
  try {
    const visitors = await getRecentVisitorLogs(req.query?.limit || 50);
    res.status(200).json({ visitors });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to fetch recent visitors.' });
  }
});

app.get('/api/visitors/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  visitorStreamClients.add(res);
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write('event: ping\ndata: {}\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    visitorStreamClients.delete(res);
  });
});

const incrementResumeDownloads = async () => {
  if (!firestore) {
    inMemoryVisitorStats.resumeDownloads = Number(inMemoryVisitorStats.resumeDownloads || 0) + 1;
    return Number(inMemoryVisitorStats.resumeDownloads || 0);
  }

  const total = await firestore.runTransaction(async (transaction) => {
    const docRef = visitorsDocRef();
    const snapshot = await transaction.get(docRef);
    const current = snapshot.exists ? Number(snapshot.data()?.resumeDownloads || 0) : 0;
    const next = current + 1;

    transaction.set(
      docRef,
      {
        resumeDownloads: next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return next;
  });

  return total;
};

const getLiveVisitorCount = async () => {
  const cutoffMs = Date.now() - LIVE_VISITOR_TTL_MS;

  if (!firestore) {
    for (const [sessionId, ts] of inMemoryLiveSessions.entries()) {
      if (ts < cutoffMs) inMemoryLiveSessions.delete(sessionId);
    }
    return inMemoryLiveSessions.size;
  }

  const liveSessionsRef = firestore.collection('liveSessions');
  const staleSnapshot = await liveSessionsRef
    .where('lastSeenAt', '<', new Date(cutoffMs))
    .limit(50)
    .get()
    .catch(() => null);
  if (staleSnapshot) {
    const batch = firestore.batch();
    staleSnapshot.forEach((doc) => batch.delete(doc.ref));
    if (!staleSnapshot.empty) {
      await batch.commit();
    }
  }

  const activeSnapshot = await liveSessionsRef.where('lastSeenAt', '>=', new Date(cutoffMs)).get();
  return activeSnapshot.size;
};

const heartbeatLiveVisitor = async (sessionId) => {
  const safeSession = String(sessionId || '').trim().slice(0, 120);
  if (!safeSession) return null;

  if (!firestore) {
    inMemoryLiveSessions.set(safeSession, Date.now());
    return safeSession;
  }

  await firestore.collection('liveSessions').doc(safeSession).set(
    {
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return safeSession;
};

const disconnectLiveVisitor = async (sessionId) => {
  const safeSession = String(sessionId || '').trim().slice(0, 120);
  if (!safeSession) return;

  if (!firestore) {
    inMemoryLiveSessions.delete(safeSession);
    return;
  }

  await firestore.collection('liveSessions').doc(safeSession).delete().catch(() => {});
};

const toDistribution = (counts = {}, keys = []) => {
  const total = keys.reduce((acc, key) => acc + Number(counts[key] || 0), 0);
  return keys.map((key) => ({
    label: key,
    count: Number(counts[key] || 0),
    percentage: total > 0 ? Math.round((Number(counts[key] || 0) / total) * 100) : 0,
  }));
};

app.post('/api/resume-downloads/increment', async (_req, res) => {
  try {
    const totalResumeDownloads = await incrementResumeDownloads();
    res.status(200).json({ totalResumeDownloads });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to increment resume downloads.' });
  }
});

app.get('/api/resume-downloads', async (_req, res) => {
  try {
    const stats = await getVisitorCount();
    res.status(200).json({ totalResumeDownloads: Number(stats.resumeDownloads || 0) });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to fetch resume downloads.' });
  }
});

app.post('/api/live-visitors/heartbeat', async (req, res) => {
  const sessionId = req.body?.sessionId;
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId is required.' });
    return;
  }

  try {
    await heartbeatLiveVisitor(sessionId);
    const liveVisitors = await getLiveVisitorCount();
    res.status(200).json({ liveVisitors });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to track live visitor heartbeat.' });
  }
});

app.post('/api/live-visitors/disconnect', async (req, res) => {
  try {
    await disconnectLiveVisitor(req.body?.sessionId);
    const liveVisitors = await getLiveVisitorCount();
    res.status(200).json({ liveVisitors });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to disconnect live visitor.' });
  }
});

app.get('/api/live-visitors', async (_req, res) => {
  try {
    const liveVisitors = await getLiveVisitorCount();
    res.status(200).json({ liveVisitors });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to fetch live visitors.' });
  }
});

app.get('/api/admin/insights', async (_req, res) => {
  try {
    const visitorStats = await getVisitorCount();
    const liveVisitors = await getLiveVisitorCount();
    const deviceDistribution = toDistribution(visitorStats.deviceCounts || {}, DEVICE_TYPES);
    const trafficDistribution = toDistribution(visitorStats.sourceCounts || {}, TRAFFIC_SOURCES);

    res.status(200).json({
      totalVisitors: Number(visitorStats.totalVisitors || 0),
      todayVisitors: Number(visitorStats.todayVisitors || 0),
      liveVisitors: Number(liveVisitors || 0),
      resumeDownloads: Number(visitorStats.resumeDownloads || 0),
      deviceCounts: visitorStats.deviceCounts || baseCountMap(DEVICE_TYPES),
      sourceCounts: visitorStats.sourceCounts || baseCountMap(TRAFFIC_SOURCES),
      deviceDistribution,
      trafficDistribution,
    });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to fetch admin insights.' });
  }
});

const analyticsDocRef = () => (firestore ? firestore.collection('siteStats').doc('analytics') : null);

const sanitizePath = (value) => {
  const path = String(value || '/').trim();
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const sanitizeEventName = (value) => {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60);
};

const incrementAnalyticsPageView = async ({ path = '/', title = '' }) => {
  const safePath = sanitizePath(path);
  const safeTitle = String(title || '').trim().slice(0, 150);

  if (!firestore) {
    inMemoryAnalyticsStats.pageViews += 1;
    inMemoryAnalyticsStats.byPath[safePath] =
      Number(inMemoryAnalyticsStats.byPath[safePath] || 0) + 1;
    inMemoryAnalyticsStats.lastVisitedAt = new Date().toISOString();
    return inMemoryAnalyticsStats;
  }

  const updated = await firestore.runTransaction(async (transaction) => {
    const docRef = analyticsDocRef();
    const snapshot = await transaction.get(docRef);
    const prev = snapshot.exists ? snapshot.data() || {} : {};
    const byPath = prev.byPath && typeof prev.byPath === 'object' ? { ...prev.byPath } : {};
    const nextViews = Number(prev.pageViews || 0) + 1;

    byPath[safePath] = Number(byPath[safePath] || 0) + 1;

    const payload = {
      pageViews: nextViews,
      byPath,
      events: prev.events && typeof prev.events === 'object' ? prev.events : {},
      lastVisitedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastPage: { path: safePath, title: safeTitle },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    transaction.set(docRef, payload, { merge: true });
    return { pageViews: nextViews, byPath };
  });

  return updated;
};

const incrementAnalyticsEvent = async ({ eventName = '', path = '/' }) => {
  const safeEventName = sanitizeEventName(eventName);
  if (!safeEventName) return null;
  const safePath = sanitizePath(path);

  if (!firestore) {
    inMemoryAnalyticsStats.events[safeEventName] =
      Number(inMemoryAnalyticsStats.events[safeEventName] || 0) + 1;
    return inMemoryAnalyticsStats;
  }

  const updated = await firestore.runTransaction(async (transaction) => {
    const docRef = analyticsDocRef();
    const snapshot = await transaction.get(docRef);
    const prev = snapshot.exists ? snapshot.data() || {} : {};
    const events = prev.events && typeof prev.events === 'object' ? { ...prev.events } : {};

    events[safeEventName] = Number(events[safeEventName] || 0) + 1;

    const payload = {
      pageViews: Number(prev.pageViews || 0),
      byPath: prev.byPath && typeof prev.byPath === 'object' ? prev.byPath : {},
      events,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    transaction.set(docRef, payload, { merge: true });
    return { events };
  });

  await firestore.collection('analyticsEvents').add({
    eventName: safeEventName,
    path: safePath,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return updated;
};

const getAnalyticsSnapshot = async () => {
  if (!firestore) return inMemoryAnalyticsStats;
  const doc = await analyticsDocRef().get();
  if (!doc.exists) {
    return { pageViews: 0, byPath: {}, events: {}, lastVisitedAt: null };
  }

  const data = doc.data() || {};
  const toIsoOrNull = (value) =>
    value && typeof value.toDate === 'function' ? value.toDate().toISOString() : null;

  return {
    pageViews: Number(data.pageViews || 0),
    byPath: data.byPath && typeof data.byPath === 'object' ? data.byPath : {},
    events: data.events && typeof data.events === 'object' ? data.events : {},
    lastVisitedAt: toIsoOrNull(data.lastVisitedAt),
  };
};

app.post('/api/analytics/pageview', async (req, res) => {
  try {
    await incrementAnalyticsPageView({
      path: req.body?.path,
      title: req.body?.title,
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to track page view.' });
  }
});

app.post('/api/analytics/event', async (req, res) => {
  const eventName = req.body?.eventName;
  if (!eventName) {
    res.status(400).json({ error: 'eventName is required.' });
    return;
  }

  try {
    await incrementAnalyticsEvent({
      eventName,
      path: req.body?.path,
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to track event.' });
  }
});

app.get('/api/analytics/overview', async (_req, res) => {
  try {
    const overview = await getAnalyticsSnapshot();
    res.status(200).json(overview);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to fetch analytics overview.' });
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

const buildFinalPrompt = ({ portfolioData, userMessage, maxChars }) => {
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
