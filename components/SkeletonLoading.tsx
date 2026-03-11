import React from 'react';

const SkeletonLoading: React.FC = () => {
    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 animate-pulse p-4 md:p-10">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-8">
                <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-64 md:w-96 shadow-sm"></div>
                <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full md:w-48 shadow-sm"></div>
            </div>

            {/* Metrics Row Skeleton - Admin Style */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="h-32 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800/50"></div>
                <div className="h-32 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800/50"></div>
                <div className="h-32 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800/50"></div>
                <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800/50"></div>
            </div>

            {/* Content Table/List Skeleton */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-sm border border-zinc-100 dark:border-zinc-800 p-6 md:p-8 space-y-6">
                {/* Search/Filter Bar Skeleton */}
                <div className="flex gap-4 mb-8">
                    <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl flex-grow"></div>
                    <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-32 hidden md:block"></div>
                    <div className="h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-32 hidden md:block"></div>
                </div>

                {/* Rows Skeleton */}
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
                        <div className="flex flex-col gap-2 w-1/3">
                            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-3/4"></div>
                            <div className="h-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md w-1/2"></div>
                        </div>
                        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-1/6 hidden md:block"></div>
                        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-md w-1/6 hidden md:block"></div>
                        <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full w-20"></div>
                        <div className="flex gap-2">
                            <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
                            <div className="h-8 w-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-center mt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-600 animate-bounce">Carregando Premium...</p>
            </div>
        </div>
    );
};

export default SkeletonLoading;
