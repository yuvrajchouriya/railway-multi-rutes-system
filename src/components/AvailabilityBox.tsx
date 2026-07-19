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

  let boxClass = 'avl-unknown';
  let statusLabel = '';
  let statusColor = 'text-gray-500';
  let statusValue = '';

  if (avl === 'AVAILABLE') {
    boxClass = 'avl-available';
    statusLabel = 'Available';
    statusColor = 'text-green-600';
    statusValue = `AVL ${cls.availableSeats ?? ''}`;
  } else if (avl === 'RAC') {
    boxClass = 'avl-rac';
    statusLabel = 'RAC';
    statusColor = 'text-orange-500';
    statusValue = `RAC ${cls.waitlistNumber ?? ''}`;
  } else if (avl === 'WL') {
    boxClass = 'avl-wl';
    statusLabel = 'Waitlist';
    statusColor = 'text-red-500';
    statusValue = `WL ${cls.waitlistNumber ?? ''}`;
  } else if (avl === 'REGRET') {
    boxClass = 'avl-wl';
    statusLabel = 'No Seats';
    statusColor = 'text-red-500';
    statusValue = 'REGRET';
  } else {
    statusLabel = 'Checking...';
    statusValue = '—';
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
