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
  
  // 🌟 ダークモード用のステートを追加
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 🌟 ダークモードの同期処理
  useEffect(() => {
    const checkDarkMode = () => {
      const savedMode = localStorage.getItem('dark_mode');
      setIsDarkMode(savedMode === 'true');
    };
    checkDarkMode();

    window.addEventListener('storage', checkDarkMode);
    window.addEventListener('darkModeChanged', checkDarkMode);
    return () => {
      window.removeEventListener('storage', checkDarkMode);
      window.removeEventListener('darkModeChanged', checkDarkMode);
    };
  }, []);

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

  // 🌟 ダークモード用のCSS変数定義
  const bgPage = isDarkMode ? "bg-[#0a0a0a]" : "bg-slate-50";
  const bgCard = isDarkMode ? "bg-[#1c1c1e] border-[#2c2c2e]" : "bg-white border-slate-100";
  const textMain = isDarkMode ? "text-white" : "text-slate-800";
  const textSub = isDarkMode ? "text-slate-400" : "text-slate-500";
  const tabBg = isDarkMode ? "bg-[#2c2c2e]" : "bg-slate-200/50";
  const tabActiveBg = isDarkMode ? "bg-[#1c1c1e] text-indigo-400 shadow-sm" : "bg-white text-indigo-600 shadow-sm";
  const tabInactive = isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-slate-400 hover:text-slate-600";

  return (
    <div className={`min-h-screen ${bgPage} p-6 font-sans transition-colors duration-300 pb-32`}>
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className={`p-3 rounded-full shadow-sm active:scale-95 transition-colors duration-300 ${bgCard}`}>
          <ArrowLeft className={`w-5 h-5 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} />
        </button>
        <h1 className={`text-xl font-black transition-colors duration-300 ${textMain}`}>コネクション</h1>
      </div>

      <div className="max-w-md mx-auto">
        {/* タブ切り替え */}
        <div className={`flex gap-2 p-1.5 rounded-2xl mb-6 transition-colors duration-300 ${tabBg}`}>
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${activeTab === 'followers' ? tabActiveBg : tabInactive}`}
          >
            フォロワー ({followers.length})
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`flex-1 py-3 rounded-xl text-xs font-black tracking-widest transition-all ${activeTab === 'following' ? tabActiveBg : tabInactive}`}
          >
            フォロー中 ({following.length})
          </button>
        </div>

        {/* ユーザーリスト */}
        <div className="space-y-3">
          {isLoading ? (
            <p className={`text-center font-bold py-10 animate-pulse ${textSub}`}>読み込み中...</p>
          ) : displayList.length === 0 ? (
            <p className={`text-center font-bold py-10 ${textSub}`}>
              {activeTab === 'followers' ? 'まだフォロワーがいません' : 'まだ誰もフォローしていません'}
            </p>
          ) : (
            displayList.map((userProfile) => (
              <div key={userProfile.id} className={`p-4 rounded-3xl border shadow-sm flex items-center gap-3 transition-colors duration-300 ${bgCard}`}>
                
                {/* 🌟 修正ポイント：min-w-0 をつけて文字が縮むのを許可する */}
                <div 
                  onClick={() => router.push(`/user/${userProfile.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer group"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 group-hover:shadow-md transition-all duration-300 ${isDarkMode ? 'bg-[#2c2c2e]' : 'bg-indigo-50'}`}>
                    {userProfile.avatar_url && !userProfile.avatar_url.startsWith('bg-') ? (
                      <img src={userProfile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className={`text-lg font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-300'}`}>
                        {userProfile.nickname?.charAt(0).toUpperCase() || <User className="w-5 h-5" />}
                      </span>
                    )}
                  </div>
                  
                  {/* 🌟 修正ポイント：truncate で長すぎる文字を「...」にする */}
                  <p className={`font-black text-sm truncate flex-1 pr-2 transition-colors duration-300 ${textMain}`}>
                    {userProfile.nickname || "ユーザー"}
                  </p>
                </div>

                {/* 🌟 修正ポイント：shrink-0 をつけてフォローボタンが押し出されないようにする */}
                <div className="shrink-0">
                  <FollowButton targetUserId={userProfile.id} />
                </div>

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
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-black tracking-widest text-slate-500">LOADING...</div>}>
      <NetworkContent />
    </Suspense>
  );
}