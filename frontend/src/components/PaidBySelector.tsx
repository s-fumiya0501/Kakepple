'use client';

import { memo } from 'react';
import { Couple } from '@/types';
import { User as UserIcon } from 'lucide-react';

interface PaidBySelectorProps {
  couple: Couple;
  userId: string;
  value: string;
  onChange: (id: string) => void;
}

function PaidBySelectorComponent({ couple, userId, value, onChange }: PaidBySelectorProps) {
  const isUser1 = couple.user1.id === userId;
  const myName = isUser1 ? couple.user1.name : couple.user2.name;
  const partnerName = isUser1 ? couple.user2.name : couple.user1.name;
  const partnerId = isUser1 ? couple.user2.id : couple.user1.id;

  return (
    <div className="mt-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">誰が払った？</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(userId)}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
            value === userId
              ? 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-400'
              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
          }`}
        >
          <UserIcon className="h-3.5 w-3.5" />
          {myName || '自分'}
        </button>
        <button
          type="button"
          onClick={() => onChange(partnerId)}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
            value === partnerId
              ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-400'
              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
          }`}
        >
          <UserIcon className="h-3.5 w-3.5" />
          {partnerName || 'パートナー'}
        </button>
      </div>
    </div>
  );
}

export const PaidBySelector = memo(PaidBySelectorComponent);
