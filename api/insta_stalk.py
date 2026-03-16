# api/insta_stalk.py
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import re
import json
from typing import Optional, Dict, Any
from pydantic import BaseModel
import random
import asyncio
from bs4 import BeautifulSoup
import time

app = FastAPI(title="Instagram Stalker API", description="Get Instagram user info by username")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

# Models
class Profile(BaseModel):
    username: str
    full_name: Optional[str] = None
    biography: Optional[str] = None
    followers: Optional[int] = None
    following: Optional[int] = None
    posts: Optional[int] = None
    is_private: bool = False
    is_verified: bool = False
    profile_pic_url: Optional[str] = None
    profile_pic_url_hd: Optional[str] = None
    external_url: Optional[str] = None
    business_category: Optional[str] = None
    business_email: Optional[str] = None
    business_phone: Optional[str] = None
    
class StalkResponse(BaseModel):
    status: str
    message: Optional[str] = None
    data: Optional[Profile] = None

# User agents for rotation
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

class InstagramScraper:
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers=self._get_headers()
        )
    
    def _get_headers(self) -> Dict:
        """Generate random headers"""
        return {
            'User-Agent': random.choice(USER_AGENTS),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
        }
    
    async def close(self):
        await self.client.aclose()
    
    async def extract_from_json(self, html: str) -> Optional[Profile]:
        """Extract user data from Instagram's shared data JSON"""
        try:
            # Method 1: Find window._sharedData
            shared_data_match = re.search(r'window\._sharedData\s*=\s*({.*?});</script>', html)
            if shared_data_match:
                data = json.loads(shared_data_match.group(1))
                user = data.get('entry_data', {}).get('ProfilePage', [{}])[0].get('graphql', {}).get('user')
                if user:
                    return self._parse_user_data(user)
            
            # Method 2: Find __additionalDataLoaded
            additional_data_match = re.search(r'__additionalDataLoaded\s*\([^,]+,\s*({.*?})\);', html)
            if additional_data_match:
                data = json.loads(additional_data_match.group(1))
                user = data.get('graphql', {}).get('user')
                if user:
                    return self._parse_user_data(user)
            
            # Method 3: Look for any JSON containing user data
            json_objects = re.findall(r'<script type="text\/javascript">([^<]+?)<\/script>', html)
            for script in json_objects:
                if '"user"' in script and 'edge_followed_by' in script:
                    # Try to extract JSON object
                    json_match = re.search(r'({.*"user".*})', script)
                    if json_match:
                        try:
                            data = json.loads(json_match.group(1))
                            if 'user' in data:
                                return self._parse_user_data(data['user'])
                            elif 'graphql' in data and 'user' in data['graphql']:
                                return self._parse_user_data(data['graphql']['user'])
                        except:
                            continue
        except Exception as e:
            print(f"JSON extraction error: {e}")
        return None
    
    def _parse_user_data(self, user_data: Dict) -> Profile:
        """Parse user data into Profile model"""
        # Handle different data structures
        if 'edge_followed_by' in user_data:
            # Modern Instagram format
            followers = user_data.get('edge_followed_by', {}).get('count')
            following = user_data.get('edge_follow', {}).get('count')
            posts = user_data.get('edge_owner_to_timeline_media', {}).get('count')
        else:
            # Alternative format
            followers = user_data.get('followers', 0) or user_data.get('follower_count', 0)
            following = user_data.get('following', 0) or user_data.get('following_count', 0)
            posts = user_data.get('posts', 0) or user_data.get('media_count', 0)
        
        return Profile(
            username=user_data.get('username', ''),
            full_name=user_data.get('full_name', ''),
            biography=user_data.get('biography', ''),
            followers=int(followers) if followers else 0,
            following=int(following) if following else 0,
            posts=int(posts) if posts else 0,
            is_private=user_data.get('is_private', False),
            is_verified=user_data.get('is_verified', False),
            profile_pic_url=user_data.get('profile_pic_url', ''),
            profile_pic_url_hd=user_data.get('profile_pic_url_hd', user_data.get('profile_pic_url', '')),
            external_url=user_data.get('external_url', ''),
            business_category=user_data.get('business_category_name', ''),
            business_email=user_data.get('business_email', ''),
            business_phone=user_data.get('business_phone_number', '')
        )
    
    async def extract_from_meta(self, html: str, username: str) -> Optional[Profile]:
        """Extract basic info from meta tags when JSON fails"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            
            # Get meta tags
            title_tag = soup.find('meta', property='og:title')
            image_tag = soup.find('meta', property='og:image')
            desc_tag = soup.find('meta', property='og:description')
            
            if title_tag and image_tag:
                title = title_tag.get('content', '')
                full_name = title.split('(')[0].strip() if '(' in title else title
                
                description = desc_tag.get('content', '') if desc_tag else ''
                
                # Try to extract follower count from description
                follower_match = re.search(r'([\d,]+)\s*Followers', description)
                followers = int(follower_match.group(1).replace(',', '')) if follower_match else 0
                
                return Profile(
                    username=username,
                    full_name=full_name,
                    biography=description,
                    followers=followers,
                    following=0,
                    posts=0,
                    is_private='private' in html.lower(),
                    is_verified='verified' in html.lower() or 'blue-badge' in html,
                    profile_pic_url=image_tag.get('content', ''),
                    profile_pic_url_hd=image_tag.get('content', '')
                )
        except Exception as e:
            print(f"Meta extraction error: {e}")
        return None
    
    async def stalk(self, username: str, max_retries: int = 3) -> StalkResponse:
        """Main method to stalk Instagram user"""
        clean_username = username.replace('@', '').strip()
        
        for attempt in range(max_retries):
            try:
                print(f"🔍 Attempt {attempt + 1}/{max_retries} for @{clean_username}")
                
                # Rotate user agent for each attempt
                self.client.headers.update({'User-Agent': random.choice(USER_AGENTS)})
                
                # Add delay between attempts
                if attempt > 0:
                    await asyncio.sleep(attempt * 2)
                
                # Request Instagram profile page
                response = await self.client.get(f'https://www.instagram.com/{clean_username}/')
                
                if response.status_code == 200:
                    html = response.text
                    
                    # Try JSON extraction first
                    profile = await self.extract_from_json(html)
                    if profile:
                        return StalkResponse(
                            status="success",
                            message="Profile found via JSON data",
                            data=profile
                        )
                    
                    # Fallback to meta tag extraction
                    profile = await self.extract_from_meta(html, clean_username)
                    if profile:
                        return StalkResponse(
                            status="success",
                            message="Profile found via meta tags (limited data)",
                            data=profile
                        )
                    
                    # If profile not found in HTML
                    if 'The link you followed may be broken' in html or 'Page Not Found' in html:
                        return StalkResponse(
                            status="error",
                            message=f"User '{clean_username}' does not exist"
                        )
                
                elif response.status_code == 404:
                    return StalkResponse(
                        status="error",
                        message=f"User '{clean_username}' not found"
                    )
                
                elif response.status_code == 429:
                    if attempt < max_retries - 1:
                        print(f"Rate limited, retrying after delay...")
                        continue
                    else:
                        return StalkResponse(
                            status="error",
                            message="Rate limited by Instagram. Please try again later."
                        )
                
                else:
                    print(f"Unexpected status code: {response.status_code}")
                    
            except httpx.TimeoutException:
                print(f"Timeout on attempt {attempt + 1}")
                if attempt == max_retries - 1:
                    return StalkResponse(
                        status="error",
                        message="Request timeout. Instagram might be blocking or slow."
                    )
                    
            except Exception as e:
                print(f"Error on attempt {attempt + 1}: {str(e)}")
                if attempt == max_retries - 1:
                    return StalkResponse(
                        status="error",
                        message=f"Failed to fetch profile: {str(e)}"
                    )
        
        return StalkResponse(
            status="error",
            message="All attempts failed. Instagram might be blocking automated requests."
        )

@app.get("/")
async def root():
    return {
        "name": "Instagram Stalker API",
        "version": "1.0.0",
        "description": "Get Instagram user information by username",
        "endpoints": {
            "/stalk": "GET - Get user info (use ?username=someone)",
            "/stalk/{}": "GET - Alternative path format"
        },
        "example": "/stalk?username=cristiano"
    }

@app.get("/stalk", response_model=StalkResponse)
async def stalk_user(username: str = Query(..., description="Instagram username to stalk")):
    """
    Get Instagram user information by username
    Example: /stalk?username=cristiano
    """
    scraper = InstagramScraper()
    try:
        result = await scraper.stalk(username)
        return result
    finally:
        await scraper.close()

@app.get("/stalk/{username}", response_model=StalkResponse)
async def stalk_user_path(username: str):
    """
    Alternative path format: /stalk/cristiano
    """
    scraper = InstagramScraper()
    try:
        result = await scraper.stalk(username)
        return result
    finally:
        await scraper.close()

@app.options("/stalk")
async def stalk_options():
    return JSONResponse(content={}, headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*"
    })

# For Vercel serverless deployment
app = app