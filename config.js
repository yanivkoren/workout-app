// config.js
// ==============================================
// הגדרות כלליות ל־Supabase REST API
// ==============================================

// כתובת הפרויקט שלך ב־Supabase
const SUPABASE_URL = 'https://gbjoudlehjovzwpyqoiv.supabase.co';

// מפתח אנונימי (anon key) לגישה צד-לקוח בלבד
const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdiam91ZGxlaGpvdnp3cHlxb2l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NDE3NzAsImV4cCI6MjA3ODAxNzc3MH0.3GrGqV6ytcjW-AU3z6Am0tmGmpNrHqRYZXHNRL_Cjzw';

// יצירת מופע axios מוגדר מראש לכל המסכים
const http = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'count=exact' // מאפשר לקבל ספירת רשומות בכותרת Content-Range
  }
});
