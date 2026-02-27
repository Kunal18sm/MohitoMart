# Mohito Mart Deployment

## 1) Backend on Render

- Create Web Service from this repo.
- Set Root Directory to `backend`.
- Build Command: `npm install`
- Start Command: `node server.js`

Required environment variables:

- `NODE_ENV=production`
- `FRONTEND_URL=https://<your-netlify-site>.netlify.app`
- `MONGODB_URL=<mongodb-atlas-uri>`
- `JWT_SECRET=<strong-random-secret>`
- `CLOUD_NAME=<cloudinary-cloud-name>`
- `CLOUD_API_KEY=<cloudinary-api-key>`
- `CLOUD_API_SECRET=<cloudinary-api-secret>`
- `ENABLE_REQUEST_LOGS=true`

## 2) Frontend on Netlify

- Create site from this repo.
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`

Required environment variable:

- `VITE_API_URL=https://<your-render-backend>.onrender.com/api`

## 3) SPA routing

`frontend/public/_redirects` contains:

`/* /index.html 200`

This prevents 404 on page refresh for React routes.

## 4) Network Error Troubleshooting

If deployed frontend shows `Network error`, verify:

- Netlify env `VITE_API_URL` is set to `https://<your-render-backend>.onrender.com/api`
- Render env `FRONTEND_URL` is set to your exact frontend origin without trailing slash (supports comma-separated multiple origins)
- Render backend URL `https://<your-render-backend>.onrender.com/` opens and returns `Mohito Mart API is running`
- After changing env vars, redeploy both services (frontend and backend)
