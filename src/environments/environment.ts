// Production settings. Point apiUrl at the deployed backend before building for production.
export const environment = {
  production: true,
  apiUrl: 'http://localhost:3000/api/v1',
  // Shown on the sign-in page for "Call support". Fallback only: owners set the live number in Website settings.
  supportPhone: '6392909743'
};
