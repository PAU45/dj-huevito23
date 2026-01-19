import React, { useState } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import api from './api';

export default function MessagePanel() {
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState('');

  const handleSave = async () => {
    try {
      await api.post('/api/messages/custom', { playMessage: msg });
      setStatus('Mensaje guardado.');
    } catch (e) {
      setStatus('Error al guardar mensaje.');
    }
  };

  return (
    <Box>
      <Typography variant="h6">Personalizar mensaje de Discord</Typography>
      <TextField label="Mensaje" fullWidth value={msg} onChange={e => setMsg(e.target.value)} sx={{ mt: 2 }} />
      <Button variant="contained" sx={{ mt: 2 }} onClick={handleSave}>Guardar</Button>
      <Typography color="primary" sx={{ mt: 2 }}>{status}</Typography>
    </Box>
  );
}
