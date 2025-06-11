/**
 * Quick test of the API endpoints
 */

async function testAPI() {
  const baseURL = 'http://localhost:3000/api';
  
  try {
    // Test auth with admin user
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
    console.log('✅ Login successful, got token');
    
    // Test organizations/me endpoint
    console.log('🏢 Testing organizations/me...');
    const orgsResponse = await fetch(`${baseURL}/organizations/me`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!orgsResponse.ok) {
      throw new Error(`Organizations failed: ${orgsResponse.status}`);
    }
    
    const organizations = await orgsResponse.json();
    console.log('✅ Organizations:', organizations);
    
    if (organizations.length === 0) {
      throw new Error('No organizations found for admin user');
    }
    
    const orgId = organizations[0].id;
    console.log(`📋 Using organization: ${orgId}`);
    
    // Test clients endpoint with org header
    console.log('👥 Testing clients endpoint...');
    const clientsResponse = await fetch(`${baseURL}/clients`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Organization-ID': orgId,
        'Content-Type': 'application/json'
      }
    });
    
    if (!clientsResponse.ok) {
      throw new Error(`Clients failed: ${clientsResponse.status}`);
    }
    
    const clients = await clientsResponse.json();
    console.log('✅ Clients:', clients);
    
    // Test campaigns endpoint with org header  
    console.log('📈 Testing campaigns endpoint...');
    const campaignsResponse = await fetch(`${baseURL}/campaigns`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'X-Organization-ID': orgId,
        'Content-Type': 'application/json'
      }
    });
    
    if (!campaignsResponse.ok) {
      throw new Error(`Campaigns failed: ${campaignsResponse.status}`);
    }
    
    const campaigns = await campaignsResponse.json();
    console.log('✅ Campaigns:', campaigns);
    
    console.log('\n🎉 All API tests passed!');
    console.log('\n📝 For frontend, set this in browser console:');
    console.log(`localStorage.setItem('current_organization_id', '${orgId}');`);
    console.log(`window.location.reload();`);
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPI();