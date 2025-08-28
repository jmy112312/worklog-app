import { createClient } from "@supabase/supabase-js";

// .env 파일에서 환경 변수를 불러옵니다.
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
