import { diagnosticConsole } from './diagnosticConsole';

// Install before the React app mounts so startup and runtime errors are retained.
diagnosticConsole.install();
