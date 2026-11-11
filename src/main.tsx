import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/unbounded'
import './styles.css'
import { Demo } from './three/Demo'

const demo = new URLSearchParams(location.search).get('demo')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{demo === 'key' || demo === 'board' ? <Demo mode={demo} /> : <Demo mode="board" />}</StrictMode>,
)
