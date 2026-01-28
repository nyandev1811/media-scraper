import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('Restoring React Root...');
try {
  const root = document.getElementById('root');
  if (!root) throw new Error('Root not found');

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('React Root mounted');
} catch (e) {
  console.error('React Root failed:', e);
}
