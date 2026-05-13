// v2
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async (req, res) => {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, firstName, listId } = req.body || {};

  if (!email || !listId) {
    return res.status(400).json({ success: false, error: 'email and listId are required' });
  }

  try {
    console.log('Key length:', process.env.BREVO_API_KEY?.length, 'First 4:', process.env.BREVO_API_KEY?.substring(0, 4));
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        attributes: { FIRSTNAME: firstName || '' },
        listIds: [parseInt(listId, 10)],
        updateEnabled: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return res.status(500).json({
        success: false,
        error: errorBody,
        keyLength: process.env.BREVO_API_KEY?.length || 0,
        keyStart: process.env.BREVO_API_KEY?.substring(0, 4) || 'empty'
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
