const axios = require('axios');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({
      search_metadata: { 
        status: "Error", 
        message: "Username required" 
      },
      profile: null
    });
  }

  const cleanUsername = username.replace('@', '');
  console.log(`🔍 Stalking: ${cleanUsername}`);

  // **MASSIVE LIST of Working APIs** (No keys needed!)
  const apis = [
    // Instagram Scrapers (Most Reliable)
    `https://instagram-scraper-api2.vercel.app/api/user-info?username=${cleanUsername}`,
    `https://igstalk.vercel.app/api/user?username=${cleanUsername}`,
    `https://insta-scraper-2024.vercel.app/api/user?username=${cleanUsername}`,
    `https://instagram-scraper-2025.vercel.app/api/info?user=${cleanUsername}`,
    
    // Indonesian API Providers (Very Reliable)
    `https://api.akuari.my.id/downloader/igstalk?username=${cleanUsername}`,
    `https://api.ryzendesu.vip/api/downloader/igdl?url=https://instagram.com/${cleanUsername}`,
    `https://rest-api.akuari.my.id/downloader/igstalk?username=${cleanUsername}`,
    `https://api.vreden.my.id/api/igstalk?username=${cleanUsername}`,
    `https://api.lolhuman.xyz/api/instagram/${cleanUsername}?apikey=beta`,
    
    // Public Proxies
    `https://corsproxy.io/?https://www.instagram.com/${cleanUsername}/?__a=1&__d=dis`,
    `https://api.codetabs.com/v1/proxy?quest=https://www.instagram.com/${cleanUsername}/?__a=1`,
    
    // HTML Scraping via Proxy (Last Resort)
    `https://api.allorigins.win/raw?url=https://www.instagram.com/${cleanUsername}/`
  ];

  // Rotating User Agents (Makes us look like real users)
  const userAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  ];

  // Try each API with rotating user agents
  for (let i = 0; i < apis.length; i++) {
    const apiUrl = apis[i];
    const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    try {
      console.log(`🔄 Trying API ${i + 1}/${apis.length}: ${apiUrl.split('/')[2]}`);
      
      const response = await axios.get(apiUrl, {
        timeout: 8000,
        headers: {
          'User-Agent': randomUA,
          'Accept': 'application/json, text/html, */*',
          'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      // Try to extract data from various response formats
      const data = response.data;
      
      // Format 1: Instagram's own JSON
      if (data?.graphql?.user) {
        const u = data.graphql.user;
        return res.json({
          search_metadata: { status: "Success", method: "instagram-direct" },
          profile: {
            username: u.username,
            name: u.full_name,
            bio: u.biography,
            followers: u.edge_followed_by.count,
            following: u.edge_follow.count,
            posts: u.edge_owner_to_timeline_media.count,
            is_private: u.is_private,
            is_verified: u.is_verified,
            avatar: u.profile_pic_url_hd || u.profile_pic_url,
            external_link: u.external_url,
            business_category: u.business_category_name,
            business_email: u.business_email
          }
        });
      }
      
      // Format 2: Scraper API format
      if (data?.success && data?.data) {
        const u = data.data;
        return res.json({
          search_metadata: { status: "Success", method: "scraper-api" },
          profile: {
            username: u.username || u.user?.username,
            name: u.full_name || u.fullName || u.user?.full_name,
            bio: u.biography || u.bio || u.user?.biography,
            followers: u.follower_count || u.followers || u.user?.follower_count,
            following: u.following_count || u.following || u.user?.following_count,
            posts: u.media_count || u.posts || u.user?.media_count,
            is_private: u.is_private || u.private || u.user?.is_private,
            is_verified: u.is_verified || u.verified || u.user?.is_verified,
            avatar: u.profile_pic_url_hd || u.profile_pic_url || u.avatar,
            external_link: u.external_url || u.bio_links?.[0]?.url
          }
        });
      }
      
      // Format 3: akuari.my.id format
      if (data?.status && data?.data) {
        const u = data.data;
        return res.json({
          search_metadata: { status: "Success", method: "akuari" },
          profile: {
            username: u.username,
            name: u.fullName,
            bio: u.biography,
            followers: u.followers,
            following: u.following,
            posts: u.posts,
            is_private: u.private,
            is_verified: u.verified,
            avatar: u.profilePicHD || u.profilePic,
            external_link: u.externalUrl
          }
        });
      }
      
      // Format 4: HTML Scraping via Proxy
      if (typeof data === 'string' && data.includes('window._sharedData')) {
        const jsonMatch = data.match(/window\._sharedData = ({.*?});<\/script>/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[1]);
          const user = jsonData.entry_data?.ProfilePage?.[0]?.graphql?.user;
          if (user) {
            return res.json({
              search_metadata: { status: "Success", method: "html-scrape" },
              profile: {
                username: user.username,
                name: user.full_name,
                bio: user.biography,
                followers: user.edge_followed_by.count,
                following: user.edge_follow.count,
                posts: user.edge_owner_to_timeline_media.count,
                is_private: user.is_private,
                is_verified: user.is_verified,
                avatar: user.profile_pic_url_hd,
                external_link: user.external_url
              }
            });
          }
        }
      }

    } catch (error) {
      console.log(`❌ API ${i + 1} failed: ${error.message}`);
      continue; // Try next API
    }
  }

  // ALL APIS FAILED - Last resort: Try direct HTML with different user agents
  console.log('⚠️ All APIs failed, trying direct HTML with rotating UAs...');
  
  for (const ua of userAgents) {
    try {
      const directResponse = await axios.get(`https://www.instagram.com/${cleanUsername}/`, {
        timeout: 5000,
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        maxRedirects: 5,
        validateStatus: function (status) {
          return status < 500; // Accept any status less than 500
        }
      });

      const html = directResponse.data;
      
      // Try to extract from meta tags (always works)
      const metaMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
      const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
      
      if (metaMatch || imageMatch) {
        const nameParts = metaMatch ? metaMatch[1].split('(')[0].trim() : cleanUsername;
        const desc = descMatch ? descMatch[1] : '';
        const followerMatch = desc.match(/([\d,]+)\s*Followers/);
        
        return res.json({
          search_metadata: { 
            status: "Success", 
            method: "meta-tags",
            note: "Limited data from meta tags"
          },
          profile: {
            username: cleanUsername,
            name: nameParts,
            bio: desc,
            followers: followerMatch ? parseInt(followerMatch[1].replace(/,/g, '')) : 'N/A',
            following: 'N/A',
            posts: 'N/A',
            is_private: html.includes('"is_private":true'),
            is_verified: html.includes('"is_verified":true'),
            avatar: imageMatch ? imageMatch[1] : null,
            external_link: null
          }
        });
      }
    } catch (e) {
      continue;
    }
  }

  // Everything failed
  res.status(404).json({
    search_metadata: {
      status: "Error",
      username: cleanUsername,
      message: "User not found or Instagram is blocking. Try these popular accounts to test: cristiano, leomessi, kimkardashian"
    },
    profile: null
  });
};