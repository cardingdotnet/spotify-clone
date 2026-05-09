import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LayoutClient from '@/components/layout/LayoutClient';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  return (
    <LayoutClient
      username={profile?.username || 'user'}
      displayName={profile?.display_name || profile?.username || 'User'}
    >
      {children}
    </LayoutClient>
  );
}
