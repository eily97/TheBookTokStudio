export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { book, chapter, name, suggested_by } = req.body;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'thatpart <onboarding@resend.dev>',
        to: 'yarenpekgil97@gmail.com',
        subject: `New chapter name suggestion — ${book}`,
        html: `<p><b>@${suggested_by}</b> suggested a name for <b>${book} Chapter ${chapter}</b>:</p><p style="font-size:18px">"${name}"</p><p>Log in to approve or reject: <a href="https://thatpart.app">thatpart.app</a></p>`
      }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
