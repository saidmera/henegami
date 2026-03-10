import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const logActivity = async (supabase: any, userId: string, actionType: string, details: string) => {
  await supabase.from('activity_logs').insert({
    user_id: userId,
    action_type: actionType,
    details: details
  });
  
  // Also update last_activity in profiles
  await supabase.from('profiles').update({ last_activity: new Date().toISOString() }).eq('id', userId);
};
