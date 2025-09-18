#!/usr/bin/env python3
"""
OAuth Redirect URI Extraction Test
Focus: Extract exact redirect URI that NextAuth sends to Google OAuth
"""

import requests
import json
import os
from urllib.parse import urlparse, parse_qs
import re

# Get base URL from environment
def get_base_url():
    try:
        with open('/app/.env', 'r') as f:
            for line in f:
                if line.startswith('NEXT_PUBLIC_BASE_URL='):
                    return line.split('=', 1)[1].strip()
    except:
        pass
    return "https://realestate-hub-123.preview.emergentagent.com"

BASE_URL = get_base_url()
API_BASE = f"{BASE_URL}/api"

def test_oauth_redirect_uri_extraction():
    """
    URGENT: Extract exact redirect URI that NextAuth sends to Google OAuth
    This will help resolve the redirect_uri_mismatch error
    """
    print("🎯 EXTRACTING EXACT OAUTH REDIRECT URI FOR GOOGLE CONSOLE CONFIGURATION")
    print("=" * 80)
    
    try:
        # Test 1: Check NextAuth providers endpoint to see Google configuration
        print("\n1. Testing NextAuth providers endpoint...")
        providers_url = f"{API_BASE}/auth/providers"
        response = requests.get(providers_url)
        
        if response.status_code == 200:
            providers = response.json()
            print(f"✅ Providers endpoint accessible: {response.status_code}")
            
            if 'google' in providers:
                google_config = providers['google']
                print(f"✅ Google provider found: {google_config}")
                
                # Extract callback URL from provider config
                if 'callbackUrl' in google_config:
                    callback_url = google_config['callbackUrl']
                    print(f"🎯 CALLBACK URL FROM PROVIDER CONFIG: {callback_url}")
                else:
                    print("ℹ️  No explicit callbackUrl in provider config")
            else:
                print("❌ Google provider not found in providers")
        else:
            print(f"❌ Providers endpoint failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing providers: {e}")
    
    try:
        # Test 2: Initiate OAuth signin and capture redirect URL
        print("\n2. Testing OAuth signin initiation to capture redirect URI...")
        signin_url = f"{API_BASE}/auth/signin/google"
        
        # Use session to handle redirects
        session = requests.Session()
        session.max_redirects = 0  # Don't follow redirects automatically
        
        response = session.post(signin_url, allow_redirects=False)
        
        print(f"📊 Signin response status: {response.status_code}")
        print(f"📊 Response headers: {dict(response.headers)}")
        
        if response.status_code in [302, 307, 308]:
            redirect_location = response.headers.get('Location', '')
            print(f"🎯 REDIRECT LOCATION: {redirect_location}")
            
            # Parse the redirect URL to extract Google OAuth parameters
            if 'accounts.google.com' in redirect_location or 'oauth2' in redirect_location:
                parsed_url = urlparse(redirect_location)
                query_params = parse_qs(parsed_url.query)
                
                print(f"\n🔍 GOOGLE OAUTH URL BREAKDOWN:")
                print(f"   Base URL: {parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}")
                print(f"   Query Parameters:")
                
                for key, value in query_params.items():
                    print(f"     {key}: {value[0] if value else 'N/A'}")
                    
                # Extract the redirect_uri parameter specifically
                if 'redirect_uri' in query_params:
                    redirect_uri = query_params['redirect_uri'][0]
                    print(f"\n🎯 EXACT REDIRECT URI BEING SENT TO GOOGLE:")
                    print(f"   {redirect_uri}")
                    print(f"\n📋 ADD THIS EXACT URI TO GOOGLE CONSOLE:")
                    print(f"   Go to Google Cloud Console > APIs & Services > Credentials")
                    print(f"   Edit your OAuth 2.0 Client ID")
                    print(f"   Add this URI to 'Authorized redirect URIs':")
                    print(f"   {redirect_uri}")
                else:
                    print("❌ No redirect_uri parameter found in OAuth URL")
                    
            else:
                print(f"⚠️  Redirect doesn't appear to be to Google OAuth: {redirect_location}")
                
        else:
            print(f"⚠️  Expected redirect response, got: {response.status_code}")
            if response.text:
                print(f"Response body: {response.text[:500]}")
                
    except Exception as e:
        print(f"❌ Error testing OAuth signin: {e}")
    
    try:
        # Test 3: Check NEXTAUTH_URL configuration
        print("\n3. Verifying NextAuth URL configuration...")
        
        with open('/app/.env', 'r') as f:
            env_content = f.read()
            
        nextauth_url_match = re.search(r'NEXTAUTH_URL=(.+)', env_content)
        if nextauth_url_match:
            nextauth_url = nextauth_url_match.group(1).strip()
            print(f"✅ NEXTAUTH_URL configured: {nextauth_url}")
            
            # Calculate expected redirect URI based on NextAuth convention
            expected_redirect_uri = f"{nextauth_url}/api/auth/callback/google"
            print(f"🎯 EXPECTED REDIRECT URI (NextAuth convention): {expected_redirect_uri}")
            
        else:
            print("❌ NEXTAUTH_URL not found in .env")
            
    except Exception as e:
        print(f"❌ Error checking NextAuth URL: {e}")
    
    try:
        # Test 4: Test the callback endpoint directly
        print("\n4. Testing callback endpoint accessibility...")
        callback_url = f"{API_BASE}/auth/callback/google"
        
        response = requests.get(callback_url)
        print(f"📊 Callback endpoint status: {response.status_code}")
        
        if response.status_code == 400:
            print("✅ Callback endpoint exists (400 expected without OAuth params)")
        elif response.status_code == 404:
            print("❌ Callback endpoint not found")
        else:
            print(f"ℹ️  Callback endpoint response: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing callback endpoint: {e}")
    
    print("\n" + "=" * 80)
    print("🎯 OAUTH REDIRECT URI EXTRACTION COMPLETED")
    print("=" * 80)

def test_nextauth_configuration():
    """
    Additional test to verify NextAuth configuration details
    """
    print("\n🔧 VERIFYING NEXTAUTH CONFIGURATION DETAILS")
    print("=" * 60)
    
    try:
        # Check environment variables
        print("\n1. Environment Variables Check:")
        
        with open('/app/.env', 'r') as f:
            env_lines = f.readlines()
            
        oauth_vars = {}
        for line in env_lines:
            line = line.strip()
            if any(var in line for var in ['NEXTAUTH_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']):
                if '=' in line:
                    key, value = line.split('=', 1)
                    # Mask sensitive values
                    if 'SECRET' in key:
                        oauth_vars[key] = f"{value[:10]}...{value[-4:]}" if len(value) > 14 else "***"
                    else:
                        oauth_vars[key] = value
        
        for key, value in oauth_vars.items():
            print(f"   ✅ {key}: {value}")
            
        # Verify Google Client ID format
        if 'GOOGLE_CLIENT_ID' in oauth_vars:
            client_id = oauth_vars['GOOGLE_CLIENT_ID']
            if client_id.endswith('.apps.googleusercontent.com'):
                print(f"   ✅ Google Client ID format valid")
            else:
                print(f"   ⚠️  Google Client ID format may be invalid")
                
    except Exception as e:
        print(f"❌ Error checking configuration: {e}")

if __name__ == "__main__":
    print("🚀 STARTING OAUTH REDIRECT URI EXTRACTION TEST")
    print(f"🌐 Base URL: {BASE_URL}")
    print(f"🔗 API Base: {API_BASE}")
    
    # Run the main OAuth redirect URI extraction test
    test_oauth_redirect_uri_extraction()
    
    # Run additional configuration verification
    test_nextauth_configuration()
    
    print("\n✅ OAUTH REDIRECT URI EXTRACTION TEST COMPLETED")
    print("\nUse the extracted redirect URI to configure Google Console OAuth settings.")