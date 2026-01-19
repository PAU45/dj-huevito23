import React, { useState } from 'react';
import { Box, Typography, Button, Input, TextField } from '@mui/material';
import api from './api';

export default function CookiesPanel() {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [b64, setB64] = useState('');

  const handleUpload = async () => {
    if (!file) return setMsg('Selecciona un archivo cookies.txt');
    const formData = new FormData();
    formData.append('cookies', file);
    try {
      await api.post('/api/cookies/upload', formData);
      setMsg('Cookies subidas correctamente.');
    } catch (e) {
      setMsg('Error al subir cookies.');
    }
  };

  const handleFileToBase64 = () => {
    if (!file) return setMsg('Selecciona un archivo cookies.txt');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result.split(',')[1];
      setB64(result);
      setMsg('Archivo convertido a base64. Puedes enviarlo o pegarlo.');
    };
    reader.onerror = () => setMsg('Error leyendo el archivo.');
    reader.readAsDataURL(file);
  };

  const handleUploadBase64 = async () => {
    if (!b64) return setMsg('No hay base64 para enviar.');
    try {
      await api.post('/api/cookies/upload-base64', { b64 });
      setMsg('Cookies subidas correctamente (base64).');
    } catch (e) {
      setMsg('Error al subir cookies base64.');
    }
  };

  return (
    <Box>
      <Typography variant="h6">Subir cookies.txt de YouTube</Typography>
      <Input type="file" onChange={e => setFile(e.target.files[0])} />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleUpload} sx={{ mr: 1 }}>Subir (archivo)</Button>
        <Button variant="outlined" onClick={handleFileToBase64} sx={{ mr: 1 }}>Convertir a base64</Button>
        <Button variant="contained" color="secondary" onClick={handleUploadBase64}>Subir (base64)</Button>
      </Box>

      <Typography color="primary" sx={{ mt: 2 }}>{msg}</Typography>

      <Typography variant="subtitle2" sx={{ mt: 2 }}>Base64 (editable):</Typography>
      <TextField
        multiline
        rows={6}
        fullWidth
        value={b64}
        onChange={e => setB64(e.target.value)}
        placeholder="Aquí aparecerá el base64 del archivo o puedes pegar uno manualmente"
      />
    </Box>
  );
}
