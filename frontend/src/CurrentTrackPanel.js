import React, { useEffect, useState } from 'react';
import { Box, Typography, Card, CardMedia, CardContent, Button } from '@mui/material';
import api from './api';

function formatDuration(sec) {
  if (!sec && sec !== 0) return '';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  return `${m}:${String(ss).padStart(2,'0')}`;
}

export default function CurrentTrackPanel() {
  const [track, setTrack] = useState(null);
  const [status, setStatus] = useState('');

  async function fetchStatus() {
    try {
      const res = await api.get('/api/player/status');
      setTrack(res.data && Object.keys(res.data).length ? res.data : null);
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    fetchStatus();
    const iv = setInterval(fetchStatus, 3000);
    return () => clearInterval(iv);
  }, []);

  async function sendCommand(cmd) {
    try {
      await api.post('/api/player/command', { command: cmd });
      setStatus('Comando enviado: ' + cmd);
    } catch (e) {
      setStatus('Error enviando comando');
    }
  }

  if (!track) return <Typography>Sin pista activa</Typography>;

  return (
    <Card sx={{ display: 'flex', alignItems: 'center' }}>
      {track.image && (
        <CardMedia component="img" sx={{ width: 160 }} image={track.image} alt={track.title} />
      )}
      <CardContent sx={{ flex: 1 }}>
        <Typography variant="h6">{track.title}</Typography>
        <Typography color="text.secondary">{track.author}</Typography>
        <Typography color="text.secondary">{formatDuration(track.duration || track.duration_ms || track.durationMS || 0)}</Typography>
        <Box sx={{ mt: 1 }}>
          <Button variant="contained" sx={{ mr: 1 }} onClick={() => sendCommand('skip')}>⏭ Skip</Button>
          <Button variant="outlined" sx={{ mr: 1 }} onClick={() => sendCommand('pause_resume')}>⏯ Pause/Resume</Button>
          <Button color="error" onClick={() => sendCommand('stop')}>⏹ Stop</Button>
        </Box>
        <Typography sx={{ mt: 1 }}>{status}</Typography>
      </CardContent>
    </Card>
  );
}
