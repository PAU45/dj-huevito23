import React from 'react';
import { Container, Typography, Box, Paper, Tabs, Tab } from '@mui/material';
import CookiesPanel from './CookiesPanel';
import SourcePanel from './SourcePanel';
import CurrentTrackPanel from './CurrentTrackPanel';

function App() {
  const [tab, setTab] = React.useState(0);
  return (
    <Container maxWidth="md" sx={{ mt: 6 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 4, background: 'linear-gradient(180deg,#ffffff,#f7fbff)' }}>
        <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 700 }}>
          🎛️ Panel DJ Huevito
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 2 }}>
          Administrador rápido — sube cookies, cambia fuente y controla el reproductor
        </Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{ mb: 3 }}>
          <Tab label="Cookies YouTube" />
          <Tab label="Fuente de Música" />
          <Tab label="Reproducción" />
        </Tabs>

        <Box sx={{ mb: 3 }}>
          <CurrentTrackPanel />
        </Box>

        <Box>
          {tab === 0 && <CookiesPanel />}
          {tab === 1 && <SourcePanel />}
          {tab === 2 && <></>}
        </Box>
      </Paper>
    </Container>
  );
}
export default App;
