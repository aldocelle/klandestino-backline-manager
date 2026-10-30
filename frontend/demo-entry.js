import { handleDemoApi } from './demo-adapter.js';
window.__KB_DEMO_API__ = handleDemoApi;
// The static demo loads only after its local adapter exists. The PHP installation
// uses app.js directly and never installs this adapter.
import('./app.js');
