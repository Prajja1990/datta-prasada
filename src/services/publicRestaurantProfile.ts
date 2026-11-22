import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface PublicRestaurantProfile {
  restaurant_name: string;
  home_content: Record<string, string>;
  tagline: string;
  tagline_kn: string;
  address: string;
  phone: string;
  opening_hours: string;
}

// No local storage or seeded restaurant fallback. Refresh on return to the page
// and periodically so settings saved in another tab reach the storefront.
export function usePublicRestaurantProfile() {
  const [profile, setProfile] = useState<PublicRestaurantProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (!isSupabaseConfigured) throw new Error('Restaurant details are unavailable.');
        const { data, error } = await supabase.rpc('get_public_restaurant_profile');
        if (error) throw error;
        if (!data || !data.home_content) throw new Error('Restaurant details have not been configured.');
        if (active) { setProfile(data); setError(null); }
      } catch {
        if (active) { setProfile(null); setError('Restaurant details are temporarily unavailable.'); }
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, []);
  return { profile, error };
}
