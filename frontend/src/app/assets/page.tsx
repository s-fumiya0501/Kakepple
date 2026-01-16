'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authApi, assetApi, Asset, AssetType } from "@/lib/api";
import { User } from "@/types";
import { Plus, Pencil, Trash2, PiggyBank } from "lucide-react";

export default function AssetsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await authApi.me();
      setUser(userRes.data);

      const typesRes = await assetApi.getTypes();
      setAssetTypes(typesRes.data.types);

      const assetsRes = await assetApi.list();
      setAssets(assetsRes.data);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      router.push('/login');
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormType('');
    setFormAmount('');
    setFormDescription('');
    setEditingAsset(null);
  };

  const handleOpenDialog = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormName(asset.name);
      setFormType(asset.asset_type);
      setFormAmount(asset.amount);
      setFormDescription(asset.description || '');
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formName || !formType || !formAmount) {
      alert('名前、種類、金額は必須です');
      return;
    }

    setFormLoading(true);
    try {
      if (editingAsset) {
        await assetApi.update(editingAsset.id, {
          name: formName,
          asset_type: formType,
          amount: parseFloat(formAmount),
          description: formDescription || undefined,
        });
      } else {
        await assetApi.create({
          name: formName,
          asset_type: formType,
          amount: parseFloat(formAmount),
          description: formDescription || undefined,
        });
      }

      handleCloseDialog();
      fetchData();
    } catch (error) {
      console.error('Failed to save asset:', error);
      alert('保存に失敗しました');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この資産を削除しますか？')) {
      return;
    }

    try {
      await assetApi.delete(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete asset:', error);
      alert('削除に失敗しました');
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `¥${num.toLocaleString()}`;
  };

  const totalAssets = assets.reduce((sum, asset) => sum + parseFloat(asset.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <p className="text-gray-500 dark:text-gray-400">読み込み中...</p>
      </div>
    );
  }

  return (
    <MainLayout user={user!}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">資産管理</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              NISA、株式、定期預金などの資産を管理
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                資産を追加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {editingAsset ? '資産を編集' : '新規資産を追加'}
                </DialogTitle>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Name */}
                <div>
                  <Label htmlFor="name" className="mb-2 block">
                    資産名 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="例: SBI証券 NISA口座"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                {/* Type */}
                <div>
                  <Label htmlFor="type" className="mb-2 block">
                    種類 <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="種類を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor="amount" className="mb-2 block">
                    現在の評価額 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="1000000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    定期的に更新することで正確な資産状況を把握できます
                  </p>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="mb-2 block">
                    メモ（任意）
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="例: 楽天VTI, 毎月3万円積立"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={formLoading}
                    className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  >
                    {formLoading ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Total Assets Card */}
        <div className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <PiggyBank className="h-6 w-6" />
            <h2 className="text-lg font-semibold">資産合計</h2>
          </div>
          <p className="text-4xl font-bold">{formatCurrency(totalAssets)}</p>
          <p className="text-sm opacity-90 mt-2">{assets.length}件の資産</p>
        </div>

        {/* Assets List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">登録済み資産</h2>
          </div>

          {assets.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <PiggyBank className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">
                まだ資産が登録されていません
              </p>
              <Button
                onClick={() => handleOpenDialog()}
                className="mt-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                最初の資産を追加
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {asset.name}
                      </p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        {asset.asset_type_label}
                      </span>
                    </div>
                    {asset.description && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
                        {asset.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(asset.amount)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenDialog(asset)}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
