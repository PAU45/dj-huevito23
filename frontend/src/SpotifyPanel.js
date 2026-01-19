import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import api from './api';

export default function SpotifyPanel() {
  const [info, setInfo] = useState('');

  const handleGetInfo = async () => {
    try {
      const res = await api.get('/api/spotify/info');
      setInfo(JSON.stringify(res.data));
    } catch (e) {
      setInfo('Error al obtener info de Spotify.');
    }
  };

  return (
    <Box>
      <Typography variant="h6">Información detallada de Spotify</Typography>
      <Button variant="contained" sx={{ mt: 2 }} onClick={handleGetInfo}>Obtener info</Button>
      <Typography sx={{ mt: 2 }}>{info}</Typography>
    </Box>
  );
}
