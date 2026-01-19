'use client';

import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-32 mt-2" />
      </div>

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-16" />
          </div>

          {/* Budget card */}
          <Skeleton className="h-40 rounded-lg" />

          {/* Stats row */}
          <div className="grid gap-3 grid-cols-3">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>

          {/* Asset cards */}
          <div className="grid gap-3 grid-cols-2">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        </div>

        {/* Couple section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-24" />
          </div>

          {/* Budget card */}
          <Skeleton className="h-40 rounded-lg" />

          {/* Stats row */}
          <div className="grid gap-3 grid-cols-3">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>

          {/* Asset cards */}
          <div className="grid gap-3 grid-cols-2">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Quick input */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <Skeleton className="h-6 w-44 mb-4" />
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-[300px] rounded-lg" />
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 dark:border-gray-700">
              <div className="flex items-center">
                <Skeleton className="h-10 w-10 rounded-full mr-3" />
                <div>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-32 mt-1" />
                </div>
              </div>
              <div className="text-right">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-10 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}
