export default function apiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  const expected = process.env.ADMIN_API_KEY || '';
  if (expected && key !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
