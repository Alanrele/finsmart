#!/usr/bin/env node
/**
 * Test Router Behavior
 * Simula diferentes rutas para verificar el comportamiento
 */

const urls = [
  'http://localhost:3001/',
  'http://localhost:3001/login',
  'http://localhost:3001/dashboard',
  'http://localhost:3001/random-route'
];

console.log('🧪 Testing Router Behavior...\n');

urls.forEach((url, index) => {
  console.log(`${index + 1}. Testing ${url}`);
  console.log(`   Expected: ${getExpectedBehavior(url)}\n`);
});

function getExpectedBehavior(url) {
  const path = new URL(url).pathname;

  switch (path) {
    case '/':
      return 'If authenticated: redirect to /dashboard, else: show Home';
    case '/login':
      return 'If authenticated: redirect to /dashboard, else: show Login';
    case '/dashboard':
      return 'If authenticated: show Dashboard, else: redirect to /login';
    default:
      return 'If authenticated: redirect to /dashboard, else: redirect to /login';
  }
}

console.log('🔧 To test manually:');
console.log('1. Open browser dev tools');
console.log('2. Go to Application > Storage > Local Storage');
console.log('3. Clear "auth-storage" entry');
console.log('4. Refresh page');
console.log('5. Should redirect to /login');
console.log('6. Use dev login to authenticate');
console.log('7. Should redirect to /dashboard');

console.log('\n📝 Debug auth state visible in top-right corner');
console.log('🎯 Use the "Logout" button to test unauthenticated flow');
