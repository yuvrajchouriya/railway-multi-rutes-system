import { ClassAvailability, ConfirmProbability } from '@/types/railway';

interface Props {
  cls: ClassAvailability;
}

const probColors: Record<ConfirmProbability, string> = {
  HIGH:    'text-green-600',
  MEDIUM:  'text-orange-500',
  LOW:     'text-red-500',
  UNKNOWN: 'text-gray-400',
};

const probLabels: Record<ConfirmProbability, string> = {
  HIGH:    '● High Chance',
  MEDIUM:  '● Med Chance',
  LOW:     '● Low Chance',
  UNKNOWN: '',
};

export default function AvailabilityBox({ cls }: Props) {
  const avl = cls.availability;
  const statusStr = (cls.statusText || (cls as any).status || '').toUpperCase();

  let boxClass = 'bg-[#152033] border border-[#263752] text-gray-300';
  let statusLabel = 'Status';
  let statusColor = 'text-gray-400';
  let statusValue = statusStr || '—';

  if (avl === 'AVAILABLE' || statusStr.includes('AVL') || statusStr.includes('AVAILABLE')) {
    boxClass = 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300';
    statusLabel = 'Available';
    statusColor = 'text-emerald-400 font-extrabold';
    statusValue = statusStr.includes('AVL') ? statusStr : `AVL ${cls.availableSeats ?? ''}`;
  } else if (avl === 'RAC' || statusStr.includes('RAC')) {
    boxClass = 'bg-amber-950/60 border border-amber-500/40 text-amber-300';
    statusLabel = 'RAC';
    statusColor = 'text-amber-400 font-extrabold';
    statusValue = statusStr.includes('RAC') ? statusStr : `RAC ${cls.waitlistNumber ?? ''}`;
  } else if (avl === 'WL' || statusStr.startsWith('WL')) {
    boxClass = 'bg-rose-950/60 border border-rose-500/40 text-rose-300';
    statusLabel = 'Waitlist';
    statusColor = 'text-rose-400 font-extrabold';
    statusValue = statusStr.startsWith('WL') ? statusStr : `WL ${cls.waitlistNumber ?? ''}`;
  } else if (statusStr.includes('NOT AVAILABLE') || statusStr.includes('REGRET') || avl === 'REGRET') {
    boxClass = 'bg-red-950/80 border border-red-700/60 text-red-300';
    statusLabel = 'Regret';
    statusColor = 'text-red-400 font-bold';
    statusValue = 'NOT AVL';
  } else if (statusStr.includes('DEPARTED')) {
    boxClass = 'bg-slate-900/80 border border-slate-700/60 text-slate-400';
    statusLabel = 'Passed';
    statusColor = 'text-slate-400 font-medium';
    statusValue = 'DEPARTED';
  } else if (statusStr.includes('CHARTING') || statusStr.includes('CHART')) {
    boxClass = 'bg-purple-950/60 border border-purple-500/40 text-purple-300';
    statusLabel = 'Charted';
    statusColor = 'text-purple-300 font-bold';
    statusValue = 'CHART DONE';
  }

  return (
    <div className={`rounded-xl p-3 min-w-[100px] flex flex-col gap-1 cursor-pointer hover:scale-105 transition-transform ${boxClass}`}>
      {/* Class name + Fare */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800">{cls.classType}</span>
        {cls.fare > 0 && (
          <span className="text-xs font-semibold text-gray-600">₹{cls.fare}</span>
        )}
      </div>

      {/* Availability count */}
      <div className={`text-base font-bold ${statusColor}`}>
        {statusValue}
      </div>

      {/* Status label */}
      <div className={`text-xs font-medium ${statusColor}`}>
        {statusLabel}
      </div>

      {/* Confirm probability */}
      {cls.confirmProbability && cls.confirmProbability !== 'UNKNOWN' && (
        <div className={`text-[10px] font-semibold mt-0.5 ${probColors[cls.confirmProbability]}`}>
          {probLabels[cls.confirmProbability]}
          {cls.confirmProbabilityPercent !== undefined && ` ${cls.confirmProbabilityPercent}%`}
        </div>
      )}
    </div>
  );
}
