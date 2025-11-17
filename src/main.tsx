import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import React from 'react'

console.log('main.tsx: Starting application...');

const rootElement = document.getElementById("root");
console.log('main.tsx: Root element found:', rootElement);

// Apply theme class to body
if (typeof document !== 'undefined') {
  document.body.classList.add('theme-vibrant-blue');
}

if (!rootElement) {
  console.error('main.tsx: Root element not found!');
} else {
  console.log('main.tsx: Creating React root...');
  const root = createRoot(rootElement);
  console.log('main.tsx: Rendering App component...');
  root.render(<App />);
  console.log('main.tsx: App component rendered');
}
