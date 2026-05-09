import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import PlayerBar from '@/components/player/PlayerBar';
import AudioPlayer from '@/components/player/AudioPlayer';

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
    <div className="flex flex-col h-screen bg-spotify-black">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar 
            username={profile?.username || 'user'} 
            displayName={profile?.display_name || profile?.username || 'User'}
          />
          <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#1f1f1f] to-spotify-black">
            {children}
          </main>
        </div>
      </div>
      
      {/* Bottom Player Bar */}
      <PlayerBar />
      
      {/* Hidden audio element handler */}
      <AudioPlayer />
    </div>
  );
}
