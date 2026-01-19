import React from 'react';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';

export default function SetupPanel() {
  const [token, setToken] = React.useState('');
  const [proxy, setProxy] = React.useState('');
  const [status, setStatus] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!token) return setStatus({ type: 'error', msg: 'El token no puede estar vacío' });
    setLoading(true);
    setStatus({ type: 'info', msg: 'Iniciando bot...' });
    try {
      const body = { token };
      if (proxy && proxy.trim()) body.proxyUrl = proxy.trim();
      const res = await fetch('/api/config/init-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', msg: json.message || 'Bot iniciándose' });
        // poll status
        const timer = setInterval(async () => {
          const s = await (await fetch('/api/bot/status')).json();
          if (s.running) {
            setStatus({ type: 'success', msg: `Bot iniciado (PID ${s.pid})` });
            clearInterval(timer);
            setLoading(false);
          }
        }, 1500);
      } else {
        setStatus({ type: 'error', msg: json.error || 'Error iniciando bot' });
        setLoading(false);
      }
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
      setLoading(false);
    }
  }

  return (
    <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">Iniciar bot desde aquí</Typography>
      <TextField
        label="Discord Bot Token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        type="password"
        fullWidth
        required
      />
      <TextField
        label="Proxy (opcional)"
        value={proxy}
        onChange={(e) => setProxy(e.target.value)}
        placeholder="http://user:pass@1.2.3.4:8080  ó  socks5://1.2.3.4:1080"
        fullWidth
      />
      <Button variant="contained" type="submit" disabled={loading}>Iniciar Bot</Button>
      {status && (
        <Alert severity={status.type === 'info' ? 'info' : status.type}>{status.msg}</Alert>
      )}
      <Typography variant="caption" color="text.secondary">Este token no se guardará en el frontend; se envía al backend en memoria.</Typography>
    </Box>
  );
}
