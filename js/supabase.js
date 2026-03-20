

const SUPABASE_URL = "https://grypjnccgmimsywwmrzx.supabase.co";
const SUPABASE_KEY = "sb_publishable_NjOxjunNuaTIjVTnREgZ8w_P0GB_O8R";

// attach client to window safely
window.db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);