import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hylxsvonqspexprqcguh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_xBk2QlzYXcLpdAghogcbPQ_ubss8NmB';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data, count, error } = await supabase
      .from('processed_articles')
      .select(`
        id, raw_article_id, summary, tags, entities, importance, importance_reason, created_at,
        raw_articles!inner(id, title, url, content, published_at, source_id,
          sources!inner(name, category)
        )
      `, { count: 'exact' });

  if (error) console.error("Error:", error);
  else console.log("Data length:", data.length, "Count:", count);
}
test();
