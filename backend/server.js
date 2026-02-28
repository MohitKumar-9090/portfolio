import cors from 'cors';
import express from 'express';
import admin from 'firebase-admin';

const app = express();
const port = process.env.PORT || 10000;
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const geminiApiBase = 'https://generativelanguage.googleapis.com/v1beta';
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
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

app.post('/api/chat', async (req, res) => {
  if (!geminiApiKey) {
    res.status(500).json({ error: 'Server is missing GEMINI_API_KEY.' });
    return;
  }

  const prompt = (req.body?.prompt || '').trim();
  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required.' });
    return;
  }

  try {
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
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Unexpected server error.' });
  }
});

app.listen(port, () => {
  console.log(`Chat backend running on port ${port}`);
});
