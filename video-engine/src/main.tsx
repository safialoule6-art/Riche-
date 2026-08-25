import React from 'react';
import ReactDOM from 'react-dom/client';
import {CompositionProvider} from '@open-motion/core';
import {SunamiTikTok} from './SunamiTikTok';

const config = {width: 1080, height: 1920, fps: 30, durationInFrames: 390};
const frame = (window as any).__OPEN_MOTION_FRAME__ || 0;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <CompositionProvider config={config} frame={frame}>
    <SunamiTikTok />
  </CompositionProvider>
);
