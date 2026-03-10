const axios = require('axios');

module.exports = async (req, res) => {
  // Enable CORS for everyone
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  const { username } = req.query;

  // Validate username
  if (!username) {
    return res.status(400).json({
      search_metadata: {
        status: "Error",
        message: "Username is required"
      }
    });
  }

  // Clean username (remove @ if present)
  const cleanUsername = username.replace('@', '');

  try {
    console.log(`🔍 Stalking Instagram user: ${cleanUsername}`);

    // Method 1: Try public Instagram API
    const apiUrl = `https://instagram-scraper-api2.vercel.app/api/user-info?username=${cleanUsername}`;
    
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = response.data;

    if (!data || !data.success) {
      throw new Error('API returned no data');
    }

    // Format the response beautifully
    const profile = {
      username: data.data?.username || cleanUsername,
      name: data.data?.full_name || cleanUsername,
      bio: data.data?.biography || "No bio available",
      followers: data.data?.follower_count || 0,
      following: data.data?.following_count || 0,
      posts: data.data?.media_count || 0,
      is_private: data.data?.is_private || false,
      is_verified: data.data?.is_verified || false,
      avatar: data.data?.profile_pic_url_hd || data.data?.profile_pic_url,
      avatar_hd: data.data?.profile_pic_url_hd,
      external_link: data.data?.external_url || null,
      business_category: data.data?.category_name || null,
      business_email: data.data?.business_email || null,
      business_phone: data.data?.business_phone || null,
      connected_fb_page: data.data?.connected_fb_page || null,
      country_block: data.data?.country_block || false,
      pronouns: data.data?.pronouns?.join(', ') || null,
      account_type: data.data?.account_type || "Personal",
      highlight_count: data.data?.highlight_count || 0,
      igtv_count: data.data?.igtv_count || 0,
      reels_count: data.data?.reels_count || 0,
      last_post: data.data?.latest_post?.timestamp || null,
      last_post_caption: data.data?.latest_post?.caption || null,
      similar_accounts: data.data?.similar_accounts || []
    };

    // Create beautiful response
    res.json({
      search_metadata: {
        status: "Success",
        username: cleanUsername,
        timestamp: new Date().toISOString(),
        source: "instagram-scraper-api2.vercel.app"
      },
      profile: profile,
      raw_data: data.data // Optional: include raw data for debugging
    });

  } catch (error) {
    console.error('Stalking failed:', error.message);

    // Try fallback method
    try {
      console.log('Trying fallback API...');
      const fallbackUrl = `https://api.akuari.my.id/downloader/igstalk?username=${cleanUsername}`;
      const fallbackResponse = await axios.get(fallbackUrl, { timeout: 5000 });
      
      if (fallbackResponse.data?.status) {
        const fd = fallbackResponse.data.data;
        
        res.json({
          search_metadata: {
            status: "Success",
            username: cleanUsername,
            timestamp: new Date().toISOString(),
            source: "api.akuari.my.id (fallback)"
          },
          profile: {
            username: fd.username,
            name: fd.fullName,
            bio: fd.biography,
            followers: fd.followers,
            following: fd.following,
            posts: fd.posts,
            is_private: fd.private,
            is_verified: fd.verified,
            avatar: fd.profilePicHD || fd.profilePic,
            avatar_hd: fd.profilePicHD,
            external_link: fd.externalUrl
          }
        });
        return;
      }
    } catch (fallbackError) {
      console.log('Fallback also failed');
    }

    // Both methods failed
    res.status(404).json({
      search_metadata: {
        status: "Error",
        username: cleanUsername,
        message: "User not found or Instagram is rate limiting"
      },
      profile: null
    });
  }
};