'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { transactionApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { PaidBySelector } from '@/components/PaidBySelector';
import {
  Plus,
  ShoppingCart,
  Package,
  Car,
  Coffee,
  Sparkles,
  Utensils,
  Home,
  Smartphone,
  Gift,
  Plane,
  BookOpen,
  Shirt,
  Zap,
  Heart,
} from 'lucide-react';

const iconMap: { [key: string]: any } = {
  ShoppingCart, Package, Car, Coffee, Sparkles, Utensils, Home,
  Smartphone, Gift, Plane, BookOpen, Shirt, Zap, Heart,
};

const defaultQuickCategories = [
  { name: '食費', icon: 'ShoppingCart', color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300' },
  { name: '日用品', icon: 'Package', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' },
  { name: '交通費', icon: 'Car', color: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' },
  { name: '交際費', icon: 'Coffee', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300' },
  { name: '娯楽費', icon: 'Sparkles', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300' },
];

interface QuickCategory {
  name: string;
  icon: string;
  color: string;
}

// Pages where FAB should NOT show (login, register, landing)
const HIDDEN_PATHS = ['/', '/login', '/register', '/password-reset', '/auth/callback'];

export function QuickInputFAB() {
  const pathname = usePathname();
  const { user, couple } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'category' | 'amount'>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSplit, setIsSplit] = useState(false);
  const [paidBy, setPaidBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickCategories, setQuickCategories] = useState<QuickCategory[]>(defaultQuickCategories);

  useEffect(() => {
    const saved = localStorage.getItem('quickCategories');
    if (saved) {
      try {
        setQuickCategories(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved categories:', e);
      }
    }
  }, []);

  const resetState = useCallback(() => {
    setStep('category');
    setSelectedCategory('');
    setAmount('');
    setDescription('');
    setIsSplit(false);
    setPaidBy(user?.id || '');
  }, [user?.id]);

  const handleOpen = useCallback(() => {
    resetState();
    setIsOpen(true);
  }, [resetState]);

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category);
    setStep('amount');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const splitEnabled = isSplit && couple !== null;
      await transactionApi.create({
        type: 'expense',
        category: selectedCategory,
        amount: parseFloat(amount),
        date: today,
        description: description || '',
        is_split: splitEnabled,
        ...(splitEnabled && paidBy ? { paid_by_user_id: paidBy } : {}),
      });

      toast({
        title: "登録完了",
        description: `${selectedCategory} ¥${parseFloat(amount).toLocaleString()} を記録しました`,
        variant: "success",
      });

      setIsOpen(false);
      resetState();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast({
        title: "エラー",
        description: "登録に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [amount, selectedCategory, description, isSplit, paidBy, couple, resetState]);

  // Don't show FAB on auth pages or if not logged in
  if (!user || HIDDEN_PATHS.includes(pathname || '')) {
    return null;
  }

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-[76px] right-4 z-20 h-14 w-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform hover:shadow-xl md:hidden"
        aria-label="支出を記録"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Quick Input Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetState();
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {step === 'category' ? (
            <>
              <DialogHeader>
                <DialogTitle>カテゴリを選択</DialogTitle>
                <DialogDescription>
                  支出のカテゴリをタップしてください
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-4">
                {quickCategories.map((category, index) => {
                  const Icon = iconMap[category.icon] || ShoppingCart;
                  return (
                    <button
                      key={`${category.name}-${index}`}
                      onClick={() => handleCategorySelect(category.name)}
                      className={`flex flex-col items-center rounded-lg p-4 ${category.color} hover:opacity-80 transition-opacity active:scale-95`}
                    >
                      <Icon className="h-7 w-7" />
                      <span className="mt-2 text-sm font-medium">{category.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const cat = quickCategories.find(c => c.name === selectedCategory);
                    if (cat) {
                      const Icon = iconMap[cat.icon] || ShoppingCart;
                      return <Icon className="h-5 w-5" />;
                    }
                    return null;
                  })()}
                  {selectedCategory}
                </DialogTitle>
                <DialogDescription>
                  金額を入力してください（今日の日付で登録）
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">¥</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 text-2xl h-14 font-bold"
                    autoFocus
                  />
                </div>
                {/* Amount suggestions */}
                <div className="flex gap-2 flex-wrap">
                  {[300, 500, 1000, 2000, 5000].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(String(val))}
                      className="px-4 py-2.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors min-h-[44px] active:scale-95"
                    >
                      ¥{val.toLocaleString()}
                    </button>
                  ))}
                </div>
                {/* Description */}
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">
                    内容（任意）
                  </label>
                  <Input
                    type="text"
                    placeholder="例: コンビニでお弁当"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSubmit();
                      }
                    }}
                  />
                </div>
                {/* Split toggle */}
                {couple && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">割り勘にする</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          パートナーと半額ずつ
                        </p>
                      </div>
                      <Switch
                        checked={isSplit}
                        onCheckedChange={(checked) => {
                          setIsSplit(checked);
                          if (checked) setPaidBy(user?.id || '');
                        }}
                      />
                    </div>
                    {isSplit && user && (
                      <PaidBySelector
                        couple={couple}
                        userId={user.id}
                        value={paidBy}
                        onChange={setPaidBy}
                      />
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="flex-row gap-2 sm:gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('category')}
                  className="flex-1"
                >
                  戻る
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!amount || parseFloat(amount) <= 0 || loading}
                  className="flex-1 bg-pink-600 hover:bg-pink-700"
                >
                  {loading ? '登録中...' : '登録する'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
