import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hylxsvonqspexprqcguh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xBk2QlzYXcLpdAghogcbPQ_ubss8NmB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
