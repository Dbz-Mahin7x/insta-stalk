# Instagram Stalker API 🕵️‍♂️

A powerful FastAPI-based Instagram user information scraper. Get detailed profile information just by username!

## 🚀 Features

- Get user profile information (username, full name, bio)
- Follower/Following counts
- Post count
- Private/Verified status
- Profile picture URLs
- Business account details
- Multiple fallback extraction methods
- Rate limiting handling
- CORS enabled

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/insta-stalker-api.git
cd insta-stalker-api
```

1. Install dependencies:

```bash
pip install -r requirements.txt
```

1. Run locally:

```bash
uvicorn api.insta_stalk:app --reload
```

🎯 Usage

API Endpoints

· GET / - API information
· GET /stalk?username={username} - Get user info by username
· GET /stalk/{username} - Alternative path format

Examples

```bash
# Get Cristiano Ronaldo's info
curl http://localhost:8000/stalk?username=cristiano

# Or using path parameter
curl http://localhost:8000/stalk/cristiano
```

Response Format

```json
{
  "status": "success",
  "message": "Profile found via JSON data",
  "data": {
    "username": "cristiano",
    "full_name": "Cristiano Ronaldo",
    "biography": "Football player...",
    "followers": 600000000,
    "following": 500,
    "posts": 3000,
    "is_private": false,
    "is_verified": true,
    "profile_pic_url": "https://...",
    "profile_pic_url_hd": "https://...",
    "external_url": "https://...",
    "business_category": null,
    "business_email": null,
    "business_phone": null
  }
}
```

🚢 Deploy to Vercel

1. Install Vercel CLI:

```bash
npm i -g vercel
```

1. Deploy:

```bash
vercel
```

1. For production:

```bash
vercel --prod
```

⚙️ Configuration

The API includes:

· Automatic user-agent rotation
· Retry logic with exponential backoff
· Multiple JSON extraction methods
· Meta tag fallback
· Rate limit handling

📝 Notes

· This API scrapes public Instagram data
· Respect Instagram's rate limits
· For educational purposes only
· May break if Instagram changes their HTML structure

📄 License

MIT

🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.
