// Netlify Function: returns the family message-wall submissions as JSON.
//
// Reads the Netlify Forms API for the form named "messages" and returns the
// approved (non-spam) submissions, newest first, capped at 50.
//
// Required env vars (set in Netlify UI → Site settings → Environment):
//   NETLIFY_FORMS_TOKEN  Personal access token with "Forms read" scope
//   NETLIFY_SITE_ID      The site ID (also visible in Site settings)

const FORM_NAME = 'messages';
const MAX = 50;

exports.handler = async () => {
  const token  = process.env.NETLIFY_FORMS_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!token || !siteId) {
    return json(500, { error: 'Server not configured' });
  }

  try {
    // 1) find the form ID for "messages"
    const formsRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/forms`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!formsRes.ok) return json(502, { error: 'Failed to list forms' });
    const forms = await formsRes.json();
    const form = forms.find((f) => f.name === FORM_NAME);
    if (!form) return json(200, { messages: [] });

    // 2) fetch submissions
    const subsRes = await fetch(
      `https://api.netlify.com/api/v1/forms/${form.id}/submissions?per_page=${MAX}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!subsRes.ok) return json(502, { error: 'Failed to fetch submissions' });
    const subs = await subsRes.json();

    const messages = subs
      .filter((s) => s.state === 'verified' || s.state === undefined || s.state === 'received')
      .map((s) => ({
        id: s.id,
        name: (s.data && s.data.name) || 'Anonymous',
        text: (s.data && s.data.message) || '',
        createdAt: s.created_at,
      }))
      .filter((m) => m.text.trim().length > 0)
      .slice(0, MAX);

    return json(200, { messages });
  } catch (err) {
    return json(500, { error: 'Unexpected error', detail: String(err) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
