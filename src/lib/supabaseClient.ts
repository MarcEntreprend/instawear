//src\lib\supabaseClient.ts

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     autoRefreshToken: true,
//     persistSession: true,
//   },
//   // La propriété `fetch` n'est pas encore dans les types officiels,
//   // mais elle est supportée par le client Supabase pour personnaliser les requêtes.
//   // On force le typage pour éviter l'erreur TS2353.
//   ...({
//     fetch: (url: string, options: RequestInit = {}) => {
//       const headers = new Headers(options.headers);
//       if (!headers.has("Accept")) {
//         headers.set("Accept", "application/json");
//       }
//       return fetch(url, { ...options, headers });
//     },
//   } as any),
// });
