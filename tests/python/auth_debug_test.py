#!/usr/bin/env python3
"""
Authentication Debug Test for Schema Cache Issue
Investigates the "Could not find the table 'public.users' in the schema cache" error
"""

import requests
import json
import os

# Load environment variables
def load_env_file():
    env_vars = {}
    try:
        with open('/app/.env', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value
                    os.environ[key] = value
    except FileNotFoundError:
        print("Warning: .env file not found")
    return env_vars

load_env_file()

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://realestate-hub-123.preview.emergentagent.com')
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

def test_schema_cache_issue():
    """Test the schema cache issue in detail"""
    print("🔍 INVESTIGATING SCHEMA CACHE ISSUE")
    print("=" * 60)
    
    # Test 1: Direct Supabase table access
    print("\n1. Testing Direct Supabase Table Access:")
    
    tables_to_test = ['users', 'properties', 'finances', 'profiles']
    
    for table in tables_to_test:
        try:
            url = f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=1"
            headers = {
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ {table}: EXISTS (found {len(data)} records)")
            elif response.status_code == 404:
                print(f"   ❌ {table}: NOT FOUND (404)")
            else:
                try:
                    error_data = response.json()
                    if 'PGRST205' in error_data.get('code', ''):
                        print(f"   ❌ {table}: SCHEMA CACHE ERROR - {error_data.get('message', '')}")
                        if 'hint' in error_data:
                            print(f"      Hint: {error_data['hint']}")
                    else:
                        print(f"   ❌ {table}: ERROR {response.status_code} - {error_data}")
                except:
                    print(f"   ❌ {table}: ERROR {response.status_code} - {response.text}")
                    
        except Exception as e:
            print(f"   ❌ {table}: EXCEPTION - {str(e)}")
    
    # Test 2: Backend API table verification
    print("\n2. Testing Backend API Table Verification:")
    
    try:
        response = requests.get(f"{BASE_URL}/api/setup-database")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Backend API Status: {data.get('database_status')}")
            tables = data.get('tables', {})
            for table, exists in tables.items():
                status = "EXISTS" if exists else "MISSING"
                print(f"   📋 {table}: {status}")
        else:
            print(f"   ❌ Backend API Error: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Backend API Exception: {str(e)}")
    
    # Test 3: Authentication flow with schema cache issue
    print("\n3. Testing Authentication Flow Impact:")
    
    # Test NextAuth session endpoint
    try:
        response = requests.get(f"{BASE_URL}/api/auth/session")
        
        if response.status_code == 200:
            session_data = response.json()
            print(f"   ✅ NextAuth Session: Working (unauthenticated: {session_data is None or not session_data})")
        else:
            print(f"   ❌ NextAuth Session Error: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ NextAuth Session Exception: {str(e)}")
    
    # Test 4: Property API impact
    print("\n4. Testing Property API Impact:")
    
    try:
        response = requests.get(f"{BASE_URL}/api/properties")
        
        if response.status_code == 401:
            print("   ✅ Property API: Properly protected (401 Unauthorized)")
        elif response.status_code == 500:
            print("   ❌ Property API: Server error (likely due to schema cache issue)")
            try:
                error_data = response.json()
                print(f"      Error: {error_data}")
            except:
                print(f"      Error: {response.text}")
        else:
            print(f"   ⚠️  Property API: Unexpected status {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Property API Exception: {str(e)}")
    
    # Test 5: Supabase schema introspection
    print("\n5. Testing Supabase Schema Introspection:")
    
    try:
        # Try to get schema information
        url = f"{SUPABASE_URL}/rest/v1/"
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Accept': 'application/vnd.pgrst.object+json'
        }
        
        response = requests.get(url, headers=headers)
        print(f"   📋 Schema endpoint status: {response.status_code}")
        
        # Try OpenAPI spec
        openapi_url = f"{SUPABASE_URL}/rest/v1/"
        headers['Accept'] = 'application/openapi+json'
        
        response = requests.get(openapi_url, headers=headers)
        if response.status_code == 200:
            try:
                openapi_data = response.json()
                paths = openapi_data.get('paths', {})
                available_tables = [path.replace('/', '') for path in paths.keys() if path.startswith('/') and path != '/']
                print(f"   📋 Available tables in schema: {available_tables}")
            except:
                print("   ⚠️  Could not parse OpenAPI schema")
        else:
            print(f"   ❌ OpenAPI schema error: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Schema introspection exception: {str(e)}")

def test_authentication_callback_error():
    """Test the AccessDenied error in authentication callback"""
    print("\n🔐 INVESTIGATING AUTHENTICATION CALLBACK ERROR")
    print("=" * 60)
    
    # Check NextAuth error handling
    try:
        response = requests.get(f"{BASE_URL}/api/auth/error?error=AccessDenied")
        print(f"NextAuth error endpoint status: {response.status_code}")
        
        if response.status_code == 302:
            print("   ✅ Error endpoint properly redirects")
        elif response.status_code == 200:
            print("   ✅ Error endpoint accessible")
        else:
            print(f"   ⚠️  Unexpected error endpoint status: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error endpoint exception: {str(e)}")
    
    # Check if custom error page exists
    try:
        response = requests.get(f"{BASE_URL}/auth/error?error=AccessDenied")
        print(f"Custom error page status: {response.status_code}")
        
        if response.status_code == 404:
            print("   ⚠️  Custom error page not found - using default NextAuth error handling")
        elif response.status_code == 200:
            print("   ✅ Custom error page exists")
        else:
            print(f"   ⚠️  Unexpected error page status: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error page exception: {str(e)}")

def main():
    print("🚀 AUTHENTICATION & SCHEMA CACHE DEBUG TEST")
    print("📍 Testing against:", BASE_URL)
    print("🗄️  Supabase URL:", SUPABASE_URL)
    print("=" * 80)
    
    test_schema_cache_issue()
    test_authentication_callback_error()
    
    print("\n" + "=" * 80)
    print("📋 SUMMARY OF FINDINGS:")
    print("=" * 80)
    print("1. Schema Cache Issue: Tables not found in Supabase schema cache")
    print("2. Backend API: Reports tables exist (likely using different access method)")
    print("3. Authentication: May fail due to inability to access users table")
    print("4. Property APIs: Protected but may have internal errors")
    print("5. Recommendation: Need to refresh Supabase schema cache or recreate tables")

if __name__ == "__main__":
    main()