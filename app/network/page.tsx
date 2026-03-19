"use client";
import { useEffect, useState, Suspense } from "react";
import { supabase } from "../../lib/supabase"; 
import { User, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import FollowButton from "../../components/FollowButton"; 

// 検索パラメータ（?tab=followers等）を受け取るためのコンポーネント
function NetworkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'following' ? 'following' : 'followers';

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNetwork = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. 自分をフォローしている人（フォロワー）のIDを取得
      const { data: followerLogs } = await supabase.from('follows').select('follower_id').eq('following_id', user.id);
      const followerIds = followerLogs?.map(f => f.follower_id) || [];

      // 2. 自分がフォローしている人のIDを取得
      const { data: followingLogs } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      const followingIds = followingLogs?.map(f => f.following_id) || [];

      // 3. 全員のプロフィールを一括で取得
      const allIds = Array.from(new Set([...followerIds, ...followingIds]));
      
      if (allIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, nickname, avatar_url').in('id', allIds);
        
        if (profiles) {
          // 取得したプロフィールを、フォロワーとフォロー中に振り分ける
          setFollowers(profiles.filter(p => followerIds.includes(p.id)));
          setFollowing(profiles.filter(p => followingIds.includes(p.id)));
        }
      }
      setIsLoading(false);
    };

    fetchNetwork();
  }, []);

  const displayList = activeTab === 'followers' ? followers : following;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-3 bg-white rounded-full shadow-sm active:scale-95 transition-transform">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-xl font-black text-slate-800">コネクション</h1>
      </div>

      <div className="max-w-md mx-auto">
        {/* タブ切り替え */}
        <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl mb-6">
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${activeTab === 'followers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            フォロワー ({followers.length})
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${activeTab === 'following' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            フォロー中 ({following.length})
          </button>
        </div>

        {/* ユーザーリスト */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center font-bold text-slate-400 py-10 animate-pulse">読み込み中...</p>
          ) : displayList.length === 0 ? (
            <p className="text-center font-bold text-slate-400 py-10">
              {activeTab === 'followers' ? 'まだフォロワーがいません' : 'まだ誰もフォローしていません'}
            </p>
          ) : (
            displayList.map((userProfile) => (
              <div key={userProfile.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                
                {/* アイコンと名前（タップで相手のプロフィールへ） */}
                <div 
                  onClick={() => router.push(`/user/${userProfile.id}`)}
                  className="flex items-center gap-4 flex-1 cursor-pointer group"
                >
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 group-hover:shadow-md transition-shadow">
                    {userProfile.avatar_url && !userProfile.avatar_url.startsWith('bg-') ? (
                      <img src={userProfile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-black text-indigo-300">
                        {userProfile.nickname?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
                      </span>
                    )}
                  </div>
                  <p className="font-black text-slate-800 text-sm">{userProfile.nickname || "ユーザー"}</p>
                </div>

                {/* フォロー/フォロー解除ボタン */}
                <FollowButton targetUserId={userProfile.id} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Next.jsの仕様上、useSearchParamsを使うコンポーネントはSuspenseで囲む必要があります
export default function NetworkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-black tracking-widest text-slate-400">LOADING...</div>}>
      <NetworkContent />
    </Suspense>
  );
}