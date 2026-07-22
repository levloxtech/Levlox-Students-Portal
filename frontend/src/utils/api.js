/**
 * Centralized API base URL configuration.
 *
 * Uses environment variable:
 *   const API_BASE_URL = import.meta.env.VITE_API_URL;
 *
 * Local development: VITE_API_URL in frontend/.env (http://localhost:5000)
 * Vercel production: VITE_API_URL environment variable in Vercel Dashboard (https://levlox-students-portal.onrender.com)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL && !import.meta.env.DEV) {
  console.error("CRITICAL: VITE_API_URL environment variable is missing in production build!");
}

// Strip trailing slash to avoid double slashes when constructing endpoints
const base = (API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')).replace(/\/+$/, '');

/**
 * Centralized API base URL including the /api prefix.
 * Example in production: https://levlox-students-portal.onrender.com/api
 */
export const API_BASE = `${base}/api`;
export default API_BASE_URL;

