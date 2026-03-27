import { createBrowserClient } from '@supabase/ssr'

// 今までの createClient ではなく、createBrowserClient を使います
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)