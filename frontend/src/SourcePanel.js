import React, { useState } from 'react';
import { Box, Typography, Button, Select, MenuItem } from '@mui/material';
import api from './api';

const fuentes = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'soundcloud', label: 'SoundCloud' },
  { value: 'bandcamp', label: 'Bandcamp' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'vimeo', label: 'Vimeo' },
];

export default function SourcePanel() {
  const [fuente, setFuente] = useState('youtube');
  const [msg, setMsg] = useState('');

  const handleChange = async () => {
    try {
      await api.post('/api/sources/change', { source: fuente });
      setMsg(`Fuente cambiada a ${fuente}`);
    } catch (e) {
      setMsg('Error al cambiar fuente.');
    }
  };

  return (
    <Box>
      <Typography variant="h6">Seleccionar fuente de música</Typography>
      <Select value={fuente} onChange={e => setFuente(e.target.value)} sx={{ minWidth: 200 }}>
        {fuentes.map(f => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
      </Select>
      <Button variant="contained" sx={{ mt: 2 }} onClick={handleChange}>Cambiar fuente</Button>
      <Typography color="primary" sx={{ mt: 2 }}>{msg}</Typography>
    </Box>
  );
}
