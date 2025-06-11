/**
 * Test all fixed routes with organization context
 */

async function testAllRoutes() {
  const baseURL = 'http://localhost:3000/api';
  
  try {
    // Test auth
    console.log('🔐 Testing admin login...');
    const loginResponse = await fetch(`${baseURL}/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'admin@demo.com', 
        password: 'any-password' 
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const { token } = await loginResponse.json();
    console.log('✅ Login successful');
    
    // Get organization
    const orgsResponse = await fetch(`${baseURL}/organizations/me`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const organizations = await orgsResponse.json();
    const orgId = organizations[0].id;
    console.log(`✅ Using organization: ${orgId}`);
    
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'X-Organization-ID': orgId,
      'Content-Type': 'application/json'
    };
    
    // Test all the fixed routes
    const routesToTest = [
      { url: '/campaigns', method: 'GET', name: 'Campaigns' },
      { url: '/clients', method: 'GET', name: 'Clients' },
      { url: '/media', method: 'GET', name: 'Media' },
      { url: '/messages/campaigns', method: 'GET', name: 'Message Campaigns' },
      { url: '/email/settings', method: 'GET', name: 'Email Settings' },
      { url: '/drive/settings', method: 'GET', name: 'Drive Settings' },
    ];
    
    for (const route of routesToTest) {
      console.log(`📡 Testing ${route.name}...`);
      const response = await fetch(`${baseURL}${route.url}`, {
        method: route.method,
        headers
      });
      
      if (response.ok) {
        console.log(`✅ ${route.name}: ${response.status}`);
      } else {
        const error = await response.text();
        console.log(`❌ ${route.name}: ${response.status} - ${error}`);
      }
    }
    
    console.log('\n🎉 All route tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAllRoutes();