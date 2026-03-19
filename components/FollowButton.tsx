"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function FollowButton({ targetUserId }: { targetUserId: string }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    const checkFollowStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyId(user.id);

      // 自分がこのユーザー(targetUserId)をフォローしているかチェック
      const { data } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single();

      if (data) setIsFollowing(true);
      setIsLoading(false);
    };
    checkFollowStatus();
  }, [targetUserId]);

  const handleToggleFollow = async () => {
    if (!myId || isLoading) return;
    setIsLoading(true);

    if (isFollowing) {
      // フォロー解除
      await supabase.from('follows').delete()
        .eq('follower_id', myId)
        .eq('following_id', targetUserId);
      setIsFollowing(false);
    } else {
      // フォローする
      await supabase.from('follows').insert([
        { follower_id: myId, following_id: targetUserId }
      ]);
      setIsFollowing(true);
    }
    setIsLoading(false);
  };

  // 自分が自分をフォローするボタンは出さない
  if (myId === targetUserId) return null;

  return (
    <button 
      onClick={handleToggleFollow}
      disabled={isLoading}
      className={`px-6 py-2 rounded-full font-black text-sm transition-all active:scale-95 ${
        isFollowing 
          ? 'bg-slate-200 text-slate-600 hover:bg-rose-100 hover:text-rose-600' 
          : 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' 
      }`}
    >
      {isLoading ? "..." : isFollowing ? "フォロー中" : "フォローする"}
    </button>
  );
}