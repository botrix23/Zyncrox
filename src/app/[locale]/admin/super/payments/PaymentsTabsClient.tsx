'use client';

import { useState } from 'react';
import { Settings, Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PaymentsClient from './PaymentsClient';
import TransactionsTab from './TransactionsTab';
import { getPlatformTransactionsAction } from '@/app/actions/superAdmin';

type Transaction = Awaited<ReturnType<typeof getPlatformTransactionsAction>>[number];

interface PlatformConfig {
  wompiAppId: string | null;
  wompiApiSecret: string | null;
  wompiIsProduction: boolean;
}

interface PlanPrices {
  BASIC: number;
  PROFESSIONAL: number;
  ENTERPRISE: number;
}

export default function PaymentsTabsClient({
  config,
  planPrices,
  initialTransactions,
  mrr,
  revenueThisMonth,
  revenuePrevMonth,
  growth,
  revenueByMonth,
  locale,
}: {
  config: PlatformConfig;
  planPrices: PlanPrices;
  initialTransactions: Transaction[];
  mrr: number;
  revenueThisMonth: number;
  revenuePrevMonth: number;
  growth: number;
  revenueByMonth: { month: string; monthEs: string; total: number }[];
  locale: string;
}) {
  const t = useTranslations('SuperAdmin.paymentsPage');
  const [tab, setTab] = useState<'config' | 'transactions'>('config');

  const tabs = [
    { id: 'config' as const,       label: t('tabConfig'),       icon: Settings },
    { id: 'transactions' as const, label: t('tabTransactions'), icon: Receipt  },
  ];

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-white/5 rounded-2xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === id
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'config' ? (
        <PaymentsClient config={config} planPrices={planPrices} />
      ) : (
        <TransactionsTab
          initialTransactions={initialTransactions}
          mrr={mrr}
          revenueThisMonth={revenueThisMonth}
          revenuePrevMonth={revenuePrevMonth}
          growth={growth}
          revenueByMonth={revenueByMonth}
          locale={locale}
        />
      )}
    </div>
  );
}
