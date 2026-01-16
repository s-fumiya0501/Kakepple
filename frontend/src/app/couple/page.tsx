'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authApi, coupleApi } from "@/lib/api";
import { User, Couple, InviteCode } from "@/types";
import { Heart, Copy, UserPlus, LogOut, Check, Sparkles, PiggyBank, BarChart3, Users } from "lucide-react";

export default function CouplePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await authApi.me();
      setUser(userRes.data);

      try {
        const coupleRes = await coupleApi.getMyCouple();
        setCouple(coupleRes.data);
      } catch (error) {
        setCouple(null);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      router.push('/login');
    }
  };

  const handleGenerateInviteCode = async () => {
    setGenerating(true);

    try {
      const res = await coupleApi.generateInvite(24);
      setInviteCode(res.data);
    } catch (error: any) {
      console.error('Failed to generate invite code:', error);
      alert(error.response?.data?.detail || '招待コードの生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleJoinCouple = async () => {
    if (!inviteCodeInput.trim()) {
      alert('招待コードを入力してください');
      return;
    }

    setJoining(true);

    try {
      await coupleApi.joinCouple(inviteCodeInput.trim());
      setIsJoinDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to join couple:', error);
      alert(error.response?.data?.detail || 'カップル登録に失敗しました');
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveCouple = async () => {
    if (!confirm('カップル登録を解除しますか？これにより、共有していた家計簿データへのアクセスができなくなります。')) {
      return;
    }

    try {
      await coupleApi.leaveCouple();
      setCouple(null);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Failed to leave couple:', error);
      alert(error.response?.data?.detail || 'カップル登録の解除に失敗しました');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  const myInfo = couple?.user1.id === user?.id ? couple?.user1 : couple?.user2;
  const partnerInfo = couple?.user1.id === user?.id ? couple?.user2 : couple?.user1;

  return (
    <MainLayout user={user!}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">カップル管理</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {couple ? 'パートナーと家計簿を共有中' : 'カップルを登録して家計簿を共有しましょう'}
          </p>
        </div>

        {couple ? (
          /* Already in a couple */
          <div className="space-y-6">
            {/* Couple Info Card */}
            <div className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5" />
                <h2 className="font-semibold">カップル情報</h2>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold">{myInfo?.name?.charAt(0)}</span>
                  </div>
                  <p className="text-sm opacity-75">あなた</p>
                  <p className="font-semibold">{myInfo?.name}</p>
                </div>

                <div className="px-6">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Heart className="h-6 w-6" fill="currentColor" />
                  </div>
                </div>

                <div className="flex-1 text-center">
                  <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold">{partnerInfo?.name?.charAt(0)}</span>
                  </div>
                  <p className="text-sm opacity-75">パートナー</p>
                  <p className="font-semibold">{partnerInfo?.name}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/20 text-center">
                <p className="text-sm opacity-75">
                  {formatDate(couple.created_at)} から一緒に管理中
                </p>
              </div>
            </div>

            {/* Features Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">利用可能な機能</h2>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">カップルの収支サマリーをダッシュボードで確認</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">支出を登録する際の割り勘機能</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">カップルの家計簿一覧を表示</span>
                </li>
              </ul>
            </div>

            {/* Leave Button */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <Button
                variant="destructive"
                onClick={handleLeaveCouple}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                カップル登録を解除
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                解除すると共有データへのアクセスができなくなります
              </p>
            </div>
          </div>
        ) : (
          /* Not in a couple yet */
          <div className="space-y-6">
            {/* Generate Invite Code */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-pink-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">招待コードを発行</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                パートナーに招待コードを送信してカップル登録を完了します
              </p>

              {inviteCode ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 p-5 text-white">
                    <p className="text-sm opacity-75 mb-2">招待コード</p>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 text-2xl font-mono font-bold tracking-widest">
                        {inviteCode.code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(inviteCode.code)}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                      >
                        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-xs opacity-75 mt-3">
                      有効期限: {formatDateTime(inviteCode.expires_at)}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <p className="font-medium">パートナーへの共有方法:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>上記の招待コードをコピー</li>
                      <li>パートナーに招待コードを送信</li>
                      <li>パートナーが「招待コードで参加」から登録</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleGenerateInviteCode}
                  disabled={generating}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  size="lg"
                >
                  {generating ? '生成中...' : '招待コードを生成'}
                </Button>
              )}
            </div>

            {/* Join with Invite Code */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-purple-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">招待コードで参加</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                パートナーから受け取った招待コードを入力してください
              </p>

              <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full" size="lg">
                    招待コードを入力
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>招待コードで参加</DialogTitle>
                    <DialogDescription>
                      パートナーから受け取った招待コードを入力してください
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label className="mb-2 block">招待コード</Label>
                      <Input
                        value={inviteCodeInput}
                        onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                        placeholder="例: ABC12345"
                        maxLength={10}
                        className="text-lg font-mono tracking-widest text-center"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setIsJoinDialogOpen(false)}
                        className="flex-1"
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={handleJoinCouple}
                        disabled={joining}
                        className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        {joining ? '登録中...' : '登録'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Benefits */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">カップル登録のメリット</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">家計簿を共有</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">2人の収支を一緒に管理できます</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PiggyBank className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">割り勘機能</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">支出を自動で半額ずつ計算</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">カップルの収支が見える</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">2人の家計状況をダッシュボードで確認</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
