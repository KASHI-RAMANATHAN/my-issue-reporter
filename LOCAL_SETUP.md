# Campus Issue Reporter - Local Setup Guide

## Project Overview
This is a full-stack application for reporting and tracking campus building issues. All Emergent branding has been removed, and the project is ready for local development.

## Prerequisites
- **Python 3.8+** - For the backend
- **Node.js 16+** - For the frontend (includes npm)
- **MongoDB** - For the database (local or cloud connection)
- **Google API Key** - For AI issue analysis (optional, but recommended)

## Quick Start (Easiest Method)

### Windows Users:
**Option 1: Batch Script**
```bash
start-local.bat
```

**Option 2: PowerShell**
```powershell
.\start-local.ps1
```

**Option 3: Manual (Two Terminals)**
See "Manual Setup" section below.

## Manual Setup (Two Terminals)

### Terminal 1: Backend Server
```bash
cd backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at: **http://localhost:8000**

### Terminal 2: Frontend Dev Server
```bash
cd frontend
npm start
```

The frontend will be available at: **http://localhost:3000**

## Configuration

### Backend Setup (.env file)
Located at: `backend/.env`

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
GOOGLE_API_KEY=your_google_api_key_here
```

#### Database Options:

**Local MongoDB:**
```
MONGO_URL="mongodb://localhost:27017"
```

**MongoDB Atlas (Cloud):**
```
MONGO_URL="mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority"
```

#### AI Analysis (Optional):
To enable automatic issue categorization and priority detection:
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add it to your `backend/.env` file:
   ```
   GOOGLE_API_KEY=your_key_here
   ```

### Frontend Setup (.env file)
Located at: `frontend/.env`

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

This is already configured for local development.

## Installation Details

### Backend Dependencies
All Python dependencies have been installed in `backend/requirements.txt`. Core packages include:
- FastAPI - Web framework
- Motor - Async MongoDB driver
- Google Generative AI - For issue analysis
- Uvicorn - ASGI server

### Frontend Dependencies
All Node.js dependencies have been installed using `npm install --legacy-peer-deps`. Core packages include:
- React 19
- React Router v7
- Tailwind CSS
- Radix UI components
- Firebase integration
- Axios for API calls

## Project Structure

```
app-main/
├── backend/
│   ├── .env              # Backend configuration
│   ├── requirements.txt  # Python dependencies
│   └── server.py         # FastAPI application
├── frontend/
│   ├── .env              # Frontend configuration
│   ├── package.json      # Node.js dependencies
│   ├── public/           # Static files
│   └── src/              # React components and code
├── .vscode/
│   └── tasks.json        # VS Code tasks for running servers
├── start-local.bat       # Windows batch startup script
├── start-local.ps1       # Windows PowerShell startup script
└── README.md             # This file
```

## Features Removed

The following Emergent-related features have been removed:
- ✓ Emergent branding and watermark
- ✓ Emergent asset CDN links (assets.emergent.sh)
- ✓ Emergent debug monitoring scripts
- ✓ Emergent LLM integration (replaced with Google Generative AI)
- ✓ Emergent domain whitelist CORS rules
- ✓ Emergent git commit signatures

## API Endpoints

### Status Check
```
GET /api/status-checks
POST /api/status-checks
```

### Issue Management
```
GET /api/issues
POST /api/issues
GET /api/issues/{id}
PATCH /api/issues/{id}
DELETE /api/issues/{id}
```

### AI Analysis
```
POST /api/analyze
```

## Troubleshooting

### Port Already in Use
If port 3000 or 8000 is already in use:

**Frontend (change port):**
```bash
PORT=3001 npm start
```

**Backend (change port):**
```bash
python -m uvicorn server:app --port 8001 --reload
```

### MongoDB Connection Issues
- Verify MongoDB is running locally: `mongod`
- Or update `MONGO_URL` to use MongoDB Atlas cloud database
- Check connection string format in `.env`

### Missing Dependencies
**For backend:**
```bash
cd backend
pip install -r requirements.txt
```

**For frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
```

### Windows Execution Policy Error
If PowerShell scripts won't run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Development Tips

### VS Code Integration
VS Code tasks are configured in `.vscode/tasks.json`. You can run tasks using:
- `Ctrl+Shift+B` - Run frontend build task
- `Ctrl+Shift+P` → "Tasks: Run Task" - Run other tasks

### Frontend Hot Reload
The frontend dev server automatically reloads when you save changes.

### Backend Auto-Reload
The backend server uses `--reload` flag with Uvicorn for hot reloading.

## Production Build

### Build Frontend
```bash
cd frontend
npm run build
```

Output will be in `frontend/build/` directory.

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Additional Notes

- The application uses Firebase for some features (check `frontend/src/lib/firebase.js`)
- MongoDB is the primary database
- Google Generative AI (Gemini) is used for issue analysis
- All communications between frontend and backend are HTTP-based at localhost

## Next Steps

1. **Start both servers** using one of the methods above
2. **Access the frontend** at http://localhost:3000
3. **Try the features**:
   - Report a new issue
   - Upload images with issues
   - View issue history
   - Check automatic categorization (if API key configured)

---

For more information or issues, check the project repository or contact the development team.
