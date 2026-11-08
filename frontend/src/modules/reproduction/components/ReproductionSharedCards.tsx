'use client';

import type { Reproduction } from '../types/reproduction.types';
import { RabbitAvatar } from '@/shared/ui';
import { Calendar, Heart } from 'lucide-react';

interface ReproductionPairSectionProps {
  reproduction: Reproduction;
}

export function ReproductionPairSection({ reproduction }: Readonly<ReproductionPairSectionProps>) {
  return (
    <div className="p-4 rounded-xl border border-default bg-theme-surface/50">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 text-center sm:text-left">
        Pareja Reproductiva
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-around gap-3 sm:gap-4">
        <div className="flex flex-col items-center text-center w-full sm:w-auto sm:flex-1 sm:max-w-[140px]">
          <RabbitAvatar
            imageUrl={reproduction.imageUrl}
            alt={reproduction.femaleCode}
            size="lg"
            ring
            rabbitId={reproduction.femaleId}
            rabbitCode={reproduction.femaleCode}
          />
          <span className="mt-2 px-2.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold rounded-full">
            Madre
          </span>
          <h5 className="font-bold text-main text-sm sm:text-base mt-1.5 truncate max-w-full">
            {reproduction.femaleName || reproduction.femaleCode}
          </h5>
          {reproduction.femaleName && (
            <p className="text-xs sm:text-sm font-semibold text-muted truncate max-w-full">{reproduction.femaleCode}</p>
          )}
        </div>

        <div className="flex flex-col items-center justify-center shrink-0 py-0.5 sm:py-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 shadow-sm">
            <Heart size={15} fill="currentColor" />
          </div>
        </div>

        <div className="flex flex-col items-center text-center w-full sm:w-auto sm:flex-1 sm:max-w-[140px]">
          <RabbitAvatar
            imageUrl={reproduction.maleImageUrl}
            alt={reproduction.maleCode ?? ''}
            size="lg"
            ring
            rabbitId={reproduction.maleId}
            rabbitCode={reproduction.maleCode}
          />
          <span className="mt-2 px-2.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-semibold rounded-full">
            Padre
          </span>
          <h5 className="font-bold text-main text-sm sm:text-base mt-1.5 truncate max-w-full">
            {reproduction.maleName || reproduction.maleCode || 'Sin macho'}
          </h5>
          {reproduction.maleName && (
            <p className="text-xs sm:text-sm font-semibold text-muted truncate max-w-full">{reproduction.maleCode}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReproductionPhaseProgressCardProps {
  phaseTitle: string;
  currentDay: number;
  totalDays?: number;
  isNearThreshold: boolean;
  dateLabel: string;
  formattedDate: string;
  bannerText?: string | null;
  bannerTone?: 'orange' | 'emerald';
}

export function ReproductionPhaseProgressCard({
  phaseTitle,
  currentDay,
  totalDays = 30,
  isNearThreshold,
  dateLabel,
  formattedDate,
  bannerText,
  bannerTone = 'orange',
}: Readonly<ReproductionPhaseProgressCardProps>) {
  const progressPercent = Math.min(100, Math.max(0, Math.round((Math.min(totalDays, Math.max(0, currentDay)) / totalDays) * 100)));
  const bannerColorClass = bannerTone === 'emerald'
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-orange-600 dark:text-orange-400';

  return (
    <div className="space-y-2 mt-2 text-xs">
      <div className="p-2.5 rounded-lg border bg-theme-surface border-default transition-colors">
        <div className="flex justify-between items-center mb-1.5">
          <span className="font-semibold text-main">
            {phaseTitle}
          </span>
          <span className="font-bold text-main">
            Día {currentDay} de {totalDays}
          </span>
        </div>

        <div className="w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isNearThreshold ? 'bg-orange-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-2.5 pt-2 border-t border-default/40 flex flex-col gap-0.5">
          <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
            <Calendar size={13} className="opacity-70 shrink-0" />
            {dateLabel}
          </span>
          <span className="text-sm sm:text-base font-bold text-main">
            {formattedDate}
          </span>
          {bannerText && (
            <div className="mt-1.5 pt-1.5 border-t border-default/30 text-center">
              <span className={`text-xs font-semibold ${bannerColorClass}`}>
                {bannerText}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

